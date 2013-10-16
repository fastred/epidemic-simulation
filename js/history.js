function History() {
  this.data = new Array();

  this.addNewData = function(susceptibleOverallCount, incubatedOverallCount,
                            infectiousOverallCount, recoveredOverallCount) {
    this.data.push({susceptible: susceptibleOverallCount,
                      incubated: incubatedOverallCount,
                      infectious: infectiousOverallCount,
                      recovered: recoveredOverallCount});
  };

  this.exportData = function() {
    var result = "# day susceptible infected recovered population\n";
    for (var i=0; i < this.data.length; i++) {
      var line = [i,
        this.data[i].susceptible,
        this.data[i].incubated + this.data[i].infectious,,
        this.data[i].recovered,
        this.data[i].incubated + this.data[i].infectious +
          this.data[i].susceptible + this.data[i].recovered
      ];
      result += line.join(" ") + "\n";
    }
    return result;
  };
}

// historiesArr is an array of histories
// returned value is an ensemble average of histories
History.average = function(historiesArr) {
  var maxLength = _.max(historiesArr, function(history) {
    return history.data.length;
  }).data.length;

  var averagedHistory = new History(); // ensemble average of histories
  for (var i=0; i < maxLength; i++) {
    var count = 0;
    var susceptibleSum = 0;
    var incubatedSum = 0;
    var infectiousSum = 0;
    var recoveredSum = 0;
    for (var historyIdx in historiesArr) {
      if (historiesArr[historyIdx].data[i] !== undefined) {
        susceptibleSum += historiesArr[historyIdx].data[i].susceptible;
        incubatedSum += historiesArr[historyIdx].data[i].incubated;
        infectiousSum += historiesArr[historyIdx].data[i].infectious;
        recoveredSum += historiesArr[historyIdx].data[i].recovered;
        count++;
      }
    }
    averagedHistory.addNewData(
      Math.round(susceptibleSum/count),
      Math.round(incubatedSum/count),
      Math.round(infectiousSum/count),
      Math.round(recoveredSum/count));
  }
  return averagedHistory;
}
