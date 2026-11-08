export function downsampleMinMaxLTTB(points, target, minMaxRatio = 4) {
  if (points.length <= target) return points;

  let preselected = points;
  if (minMaxRatio > 0) {
    preselected = minMaxPreselect(points, target * minMaxRatio);
  }

  return lttb(preselected, target);
}

function minMaxPreselect(points, targetCount) {
  const bucketSize = Math.max(2, Math.floor(points.length / (targetCount / 2)));
  const result = [];

  for (let i = 0; i < points.length; i += bucketSize) {
    const end = Math.min(i + bucketSize, points.length);
    let minY = Infinity, maxY = -Infinity;
    let minPoint = null, maxPoint = null;

    for (let j = i; j < end; j++) {
      const p = points[j];
      if (p.y < minY) { minY = p.y; minPoint = p; }
      if (p.y > maxY) { maxY = p.y; maxPoint = p; }
    }

    if (minPoint) result.push(minPoint);
    if (maxPoint && maxPoint !== minPoint) result.push(maxPoint);
  }

  return result;
}

function lttb(points, target) {
  const n = points.length;
  if (target >= n || target < 3) return points;

  const sampled = [];
  const bucketSize = (n - 2) / (target - 2);

  sampled.push(points[0]);

  let a = 0;

  for (let i = 0; i < target - 2; i++) {
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, n);

    let avgX = 0, avgY = 0;
    const avgRangeLength = avgRangeEnd - avgRangeStart;
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += points[j].x;
      avgY += points[j].y;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;

    const pointA = points[a];

    let maxArea = -1;
    let maxAreaIndex = rangeStart;

    for (let j = rangeStart; j < rangeEnd; j++) {
      const pointB = points[j];
      const area = Math.abs(
        (pointA.x - avgX) * (pointB.y - pointA.y) -
        (pointA.x - pointB.x) * (avgY - pointA.y)
      ) / 2;

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled.push(points[maxAreaIndex]);
    a = maxAreaIndex;
  }

  sampled.push(points[n - 1]);

  return sampled;
}
