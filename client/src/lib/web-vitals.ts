import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals';
import { telemetry } from './logger';

function sendToTelemetry(metric: Metric) {
  telemetry.log('Web Vital', {
    metric_name: metric.name,
    value: metric.value,
    rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    delta: metric.delta,
    id: metric.id,
    navigation_type: metric.navigationType
  });
}

export function reportWebVitals() {
  onCLS(sendToTelemetry);
  onINP(sendToTelemetry);
  onLCP(sendToTelemetry);
  onFCP(sendToTelemetry);
  onTTFB(sendToTelemetry);
}
