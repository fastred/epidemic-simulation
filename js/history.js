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

