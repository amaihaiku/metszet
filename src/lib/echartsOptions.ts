/**
 * OmniForecast - Apache ECharts Options & Synchronization Engine
 * Clean, Bright Light Theme Optimized for Single Viewport Layout
 */

import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

export const OMNI_GROUP = 'omni-group';

export function connectOmniGroup(): void {
  try {
    echarts.connect(OMNI_GROUP);
  } catch (err) {
    console.warn('[connectOmniGroup] Failed to connect echarts group:', err);
  }
}

export function formatTimeLabel(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return isoString.slice(11, 16);
  }

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatFullDateTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  return date.toLocaleDateString('hu-HU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 1. Single Model Timeline Chart Option (Light Theme)
 */
export function getSingleModelChartOption(
  timestamps: string[],
  temperatures: number[],
  rain: number[],
  modelColor: string,
  modelName: string
): EChartsOption {
  const validTemps = temperatures.filter((t) => Number.isFinite(t));
  const minTemp = validTemps.length > 0 ? Math.floor(Math.min(...validTemps)) - 1 : 0;
  const maxTemp = validTemps.length > 0 ? Math.ceil(Math.max(...validTemps)) + 1 : 30;

  return {
    backgroundColor: 'transparent',
    animationDuration: 300,
    grid: {
      top: 14,
      right: 14,
      bottom: 20,
      left: 38,
      containLabel: false,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [6, 10],
      textStyle: {
        color: '#0f172a',
        fontSize: 11,
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-radius: 8px;',
      axisPointer: {
        type: 'line',
        snap: true,
        lineStyle: {
          color: modelColor,
          type: 'dashed',
          width: 1.5,
        },
      },
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const index = (params[0] as { dataIndex: number }).dataIndex;
        const timeStr = timestamps[index] ?? '';
        const temp = temperatures[index];
        const precip = rain[index] ?? 0;

        return `
          <div style="font-family: system-ui, sans-serif; font-size: 11px;">
            <div style="color: #64748b; margin-bottom: 2px; font-weight: 500;">
              ${formatFullDateTime(timeStr)}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
              <span style="color: ${modelColor}; font-weight: 600;">${modelName}:</span>
              <span style="font-weight: 700; color: #0f172a;">${temp !== undefined ? temp.toFixed(1) : '--'}°C</span>
            </div>
            ${
              precip > 0
                ? `<div style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
                     <span style="color: #0284c7;">Csapadék:</span>
                     <span style="font-weight: 600; color: #0369a1;">${precip.toFixed(1)} mm</span>
                   </div>`
                : ''
            }
          </div>
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0',
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: (val: string) => formatTimeLabel(val),
      },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        min: minTemp,
        max: maxTemp,
        splitNumber: 3,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: '{value}°',
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9',
            width: 1,
          },
        },
      },
      {
        type: 'value',
        min: 0,
        max: (value) => Math.max(value.max * 3.5, 6),
        show: false,
      },
    ],
    series: [
      {
        name: `${modelName} Hőmérséklet`,
        type: 'line',
        data: temperatures,
        smooth: 0.35,
        showSymbol: false,
        symbolSize: 5,
        itemStyle: { color: modelColor },
        lineStyle: { width: 2.2, color: modelColor },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${modelColor}25` },
            { offset: 1, color: `${modelColor}00` },
          ]),
        },
        z: 3,
      },
      {
        name: 'Csapadék',
        type: 'bar',
        yAxisIndex: 1,
        data: rain,
        barMaxWidth: 5,
        itemStyle: {
          color: 'rgba(2, 132, 199, 0.45)',
          borderRadius: [2, 2, 0, 0],
        },
        z: 2,
      },
    ],
  };
}

/**
 * 2. Consensus Timeline Chart Option (Light Theme)
 */
export function getConsensusChartOption(
  timestamps: string[],
  weightedTemp: number[],
  tempMin: number[],
  tempMax: number[],
  rainMedian: number[],
  confidenceScores?: number[]
): EChartsOption {
  const allMins = tempMin.filter((v) => Number.isFinite(v));
  const allMaxs = tempMax.filter((v) => Number.isFinite(v));
  const minY = allMins.length > 0 ? Math.floor(Math.min(...allMins)) - 1 : 0;
  const maxY = allMaxs.length > 0 ? Math.ceil(Math.max(...allMaxs)) + 1 : 30;

  const bandDiff = tempMax.map((maxVal, i) => {
    const minVal = tempMin[i] ?? maxVal;
    return Number(Math.max(0, maxVal - minVal).toFixed(2));
  });

  return {
    backgroundColor: 'transparent',
    animationDuration: 350,
    grid: {
      top: 24,
      right: 18,
      bottom: 22,
      left: 38,
      containLabel: false,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: '#0f172a',
        fontSize: 11,
      },
      extraCssText: 'box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); border-radius: 10px;',
      axisPointer: {
        type: 'line',
        snap: true,
        lineStyle: {
          color: '#0284c7',
          type: 'dashed',
          width: 1.5,
        },
      },
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const index = (params[0] as { dataIndex: number }).dataIndex;
        const timeStr = timestamps[index] ?? '';
        const consensus = weightedTemp[index] ?? 0;
        const minT = tempMin[index] ?? 0;
        const maxT = tempMax[index] ?? 0;
        const spread = Math.max(0, maxT - minT);
        const rain = rainMedian[index] ?? 0;
        const confidence = confidenceScores ? confidenceScores[index] ?? 80 : 80;

        const confColor =
          confidence >= 85 ? '#059669' : confidence >= 70 ? '#d97706' : '#e11d48';
        const confLabel =
          confidence >= 85
            ? 'Magas konszenzus'
            : confidence >= 70
              ? 'Mérsékelt'
              : 'Nagy bizonytalanság';

        return `
          <div style="font-family: system-ui, sans-serif; min-width: 180px;">
            <div style="color: #64748b; font-size: 10px; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
              ${formatFullDateTime(timeStr)}
            </div>

            <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #0284c7; font-size: 11px; font-weight: 600;">Konszenzus:</span>
              <span style="font-size: 15px; font-weight: 800; color: #0f172a;">${consensus.toFixed(1)}°C</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 3px;">
              <span>Tartomány (szórás):</span>
              <span style="font-weight: 600; color: #334155;">${minT.toFixed(1)}° - ${maxT.toFixed(1)}° (${spread.toFixed(1)}°)</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 3px;">
              <span>Csapadék:</span>
              <span style="font-weight: 600; color: #0284c7;">${rain.toFixed(1)} mm</span>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; margin-top: 4px; padding-top: 3px; border-top: 1px solid #f1f5f9;">
              <span style="color: #64748b;">Megbízhatóság:</span>
              <span style="color: ${confColor}; font-weight: 700;">${confidence}% (${confLabel})</span>
            </div>
          </div>
        `;
      },
    },
    xAxis: {
      type: 'category',
      data: timestamps,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#e2e8f0',
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: (val: string) => formatTimeLabel(val),
      },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        min: minY,
        max: maxY,
        splitNumber: 3,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: '{value}°',
        },
        splitLine: {
          lineStyle: {
            color: '#f1f5f9',
            width: 1,
          },
        },
      },
      {
        type: 'value',
        min: 0,
        max: (value) => Math.max(value.max * 4, 6),
        show: false,
      },
    ],
    series: [
      {
        name: 'Min Hőmérséklet Alap',
        type: 'line',
        data: tempMin,
        stack: 'confidence-band',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        silent: true,
        z: 1,
      },
      {
        name: 'Modell Bizonytalansági Sáv',
        type: 'line',
        data: bandDiff,
        stack: 'confidence-band',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: 'rgba(2, 132, 199, 0.12)',
        },
        silent: true,
        z: 1,
      },
      {
        name: 'Súlyozott Konszenzus',
        type: 'line',
        data: weightedTemp,
        smooth: 0.35,
        showSymbol: false,
        symbolSize: 5,
        itemStyle: { color: '#0284c7' },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#0284c7' },
            { offset: 0.5, color: '#4f46e5' },
            { offset: 1, color: '#7c3aed' },
          ]),
        },
        z: 4,
      },
      {
        name: 'Csapadék Medián',
        type: 'bar',
        yAxisIndex: 1,
        data: rainMedian,
        barMaxWidth: 6,
        itemStyle: {
          color: 'rgba(2, 132, 199, 0.45)',
          borderRadius: [2, 2, 0, 0],
        },
        z: 2,
      },
    ],
  };
}
