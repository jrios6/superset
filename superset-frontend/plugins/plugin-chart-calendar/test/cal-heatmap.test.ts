/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import CalHeatMapImport from '../src/vendor/cal-heatmap';

type DateFormatter = (date: Date, format: string) => string;
type FunctionalDateFormat = (date: Date) => string;

interface CalHeatMapInstance {
  options: {
    dateFormatter: DateFormatter | null;
    timeFormatter: (t: number) => string;
    valueFormatter: (v: number) => string;
    domain: string;
    subDomain: string;
    weekStartOnMonday: boolean;
  };
  formatDate(date: Date, format: string | FunctionalDateFormat): string;
  getSubDomain(date: Date): Date[];
  getMonthWeekNumber(date: Date | number, month?: Date | number): number;
  getSubDomainColumnNumber(date: Date): number;
  tip: { html(): (d: { t: number; v: number }) => string };
  legendTip: { html(): (d: number) => string };
}

const CalHeatMap = CalHeatMapImport as unknown as new () => CalHeatMapInstance;

test('CalHeatMap delegates string date formats to the configured formatter', () => {
  const calendar = new CalHeatMap();
  const date = new Date(2024, 0, 1);
  const dateFormatter = jest.fn<string, [Date, string]>(() => 'Январь');
  calendar.options.dateFormatter = dateFormatter;

  expect(calendar.formatDate(date, '%B')).toBe('Январь');
  expect(dateFormatter).toHaveBeenCalledWith(date, '%B');
});

test('CalHeatMap preserves functional formatters over the configured formatter', () => {
  const calendar = new CalHeatMap();
  const date = new Date(2024, 0, 1);
  const dateFormatter = jest.fn<string, [Date, string]>(() => 'localized');
  const functionalFormat = jest.fn<string, [Date]>(() => 'custom');
  calendar.options.dateFormatter = dateFormatter;

  expect(calendar.formatDate(date, functionalFormat)).toBe('custom');
  expect(functionalFormat).toHaveBeenCalledWith(date);
  expect(dateFormatter).not.toHaveBeenCalled();
});

test('CalHeatMap keeps the D3 formatter fallback', () => {
  const calendar = new CalHeatMap();
  const date = new Date(2024, 0, 1);

  expect(calendar.formatDate(date, '%B')).toBe('January');
});

test('cell tooltip HTML escapes creator-controlled formatter output', () => {
  // Regression test: the tip's .html() callback is assigned to the
  // tooltip node via innerHTML (d3-tip), so formatter output must be
  // escaped before it's returned.
  const calendar = new CalHeatMap();
  calendar.options.timeFormatter = () => '<img src=x onerror=alert(1)>';
  calendar.options.valueFormatter = () => '<svg onload=alert(2)>';

  const html = calendar.tip.html()({ t: 0, v: 1 });

  expect(html).not.toContain('<img');
  expect(html).not.toContain('<svg');
  expect(html).toContain('&lt;img');
  expect(html).toContain('&lt;svg');
});

test.each([
  ['a month starting on Monday', new Date(2025, 8, 1), true, 5],
  ['a month starting mid-week', new Date(2025, 9, 1), true, 5],
  ['a month spanning a year boundary', new Date(2025, 0, 1), true, 5],
  ['a month spanning six weeks', new Date(2024, 11, 1), true, 6],
  ['a month with weeks starting on Sunday', new Date(2025, 5, 1), false, 5],
])(
  'week subdomain cells in %s are contiguous from column 0',
  (_, monthStart, weekStartOnMonday, expectedWeeks) => {
    const calendar = new CalHeatMap();
    calendar.options.domain = 'month';
    calendar.options.subDomain = 'week';
    calendar.options.weekStartOnMonday = weekStartOnMonday;

    const weeks = calendar.getSubDomain(monthStart);
    const positions = weeks.map(week =>
      calendar.getMonthWeekNumber(week, monthStart),
    );

    expect(weeks).toHaveLength(expectedWeeks);
    expect(positions).toEqual([...Array(expectedWeeks).keys()]);
    expect(calendar.getSubDomainColumnNumber(monthStart)).toBe(expectedWeeks);
  },
);

test('legend tooltip HTML escapes creator-controlled formatter output', () => {
  const calendar = new CalHeatMap();
  calendar.options.valueFormatter = () => '<img src=x onerror=alert(1)>';

  const html = calendar.legendTip.html()(1);

  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;img');
});
