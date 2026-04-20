//my code following videos and websites provided (some out of order but it works!)

Map.setCenter(-109.976424, 40.301871, 16);

var dataset = ee.ImageCollection('USDA/NAIP/DOQQ')
                  .filter(ee.Filter.date('2018-01-01', '2018-12-31'));
var trueColor = dataset.select(['R', 'G', 'B']);
var trueColorVis = {
  min: 0,
  max: 255,
};

var utah1 = trueColor.median().clip(geometry);
//print(trueColor)

var yearBefore = "2014";
var yearAfter = "2021";
 
var datasetBefore = ee.ImageCollection('USDA/NAIP/DOQQ').filter(ee.Filter.bounds(geometry)).filter(ee.Filter.date(yearBefore + '-01-01', yearBefore + '-12-31'));


var datasetAfter = ee.ImageCollection('USDA/NAIP/DOQQ').filter(ee.Filter.bounds(geometry)).filter(ee.Filter.date(yearAfter + '-01-01', yearAfter + '-12-31'));

// var trueColor = dataset.select(['R', 'G', 'B']);
var befImg = datasetBefore.select(['R','G','B']);
befImg = befImg.median().clip(geometry);

var aftImg = datasetAfter.select(['R','G','B']);
aftImg = aftImg.median().clip(geometry);

var lookup = function(sourceHist, targetHist) {
  // Split the histograms by column and normalize the counts.
  var sourceValues = sourceHist.slice(1, 0, 1).project([0])
  var sourceCounts = sourceHist.slice(1, 1, 2).project([0])
  sourceCounts = sourceCounts.divide(sourceCounts.get([-1]))

  var targetValues = targetHist.slice(1, 0, 1).project([0])
  var targetCounts = targetHist.slice(1, 1, 2).project([0])
  targetCounts = targetCounts.divide(targetCounts.get([-1]))

  // Find first position in target where targetCount >= srcCount[i], for each i.
  var lookup = sourceCounts.toList().map(function(n) {
    var index = targetCounts.gte(n).argmax()
    return targetValues.get(index)
  })
  return {x: sourceValues.toList(), y: lookup}
}

// Make the histogram of sourceImg match targetImg.
var histogramMatch = function(sourceImg, targetImg) {
  var geom = sourceImg.geometry();
  var args = {
    reducer: ee.Reducer.autoHistogram({maxBuckets: 256, cumulative: true}), 
    geometry: geom,
    scale: 30, // Need to specify a scale, but it doesn't matter what it is because bestEffort is true.
    maxPixels: 65536 * 4 - 1,
    bestEffort: true
  }
  
  // Only use pixels in target that have a value in source (inside the footprint and unmasked).
  var source = sourceImg.reduceRegion(args)
  var target = targetImg.updateMask(sourceImg.mask()).reduceRegion(args)

  return ee.Image.cat(
    sourceImg.select(['R']).interpolate(lookup(source.getArray('R'), target.getArray('R'))),
    sourceImg.select(['G']).interpolate(lookup(source.getArray('G'), target.getArray('G'))),
    sourceImg.select(['B']).interpolate(lookup(source.getArray('B'), target.getArray('B')))
  )
}

var result = histogramMatch(befImg, utah1)
var result2 = histogramMatch(aftImg, utah1)

Map.addLayer(aftImg, trueColorVis, yearAfter);
Map.addLayer(utah1, trueColorVis, '2018');
Map.addLayer(befImg, trueColorVis, yearBefore);
Map.addLayer(result, trueColorVis, "Histogram Match " + yearBefore)
Map.addLayer(result2, trueColorVis, "Histogram Match " + yearAfter)


Export.image.toDrive({
  image: result,
  description: 'Histogram Matched' + yearBefore,
  scale: 0.6,
  region: geometry
})

Export.image.toDrive({
  image: utah1,
  description: '2018',
  scale: 0.6,
  region: geometry
})


Export.image.toDrive({
  image: result2,
  description: 'Histogram Matched' + yearAfter,
  scale: 0.6,
  region: geometry
})