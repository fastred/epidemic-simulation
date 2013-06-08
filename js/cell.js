// This class represents one cell in the grid.
function Cell(_populationCount, _populationLimit) {
  // [0] is susceptible
  // [1..2] is incubated
  // [3..6] is infectious
  // [7] is recovered
  this.statesCount = makeArrayOf(0, config.statesCountLength);
  this.statesCount[0] = _populationCount;
  this.populationLimit = _populationLimit;

  // Simulates births and deaths
  this.simBirthsAndDeaths = function(birth, death, virusMorb) {
    for (var i = 0; i < config.statesCountLength; i++ ) {
      var delta = birth - death;
      if (i >= config.incubatedIndex && i < config.infectiousIndex + config.infectiousDays) {
        delta -= virusMorb;
      }
      this.statesCount[i] = Math.round(this.statesCount[i] * (1 + delta));
    }
  }

  // Simulates new infections (with given probability).
  this.simInfections = function(index, immigrants) {
    if (this.populationCount() > 0) {
      var prob = config.contactInfectionRate;
      var immigrantsSusceptible = 0;
      var immigrantsIncubated = 0;
      var immigrantsInfectious = 0;
      var immigrantsRecovered = 0;
      var immigrantsPopulation = 0;
      // immigrant counts (coming from different neighbours)
      for (var i in immigrants) {
        immigrantsSusceptible += immigrants[i].susceptibleCount();
        immigrantsIncubated += immigrants[i].incubatedCount();
        immigrantsInfectious += immigrants[i].infectiousCount();
        immigrantsRecovered += immigrants[i].recoveredCount();
      }
      immigrantsPopulation += immigrantsSusceptible + immigrantsIncubated +
        immigrantsInfectious + immigrantsRecovered;
      // probability of infection, uses local and immigrant population data
      var prob_q;
      var infectivePercentage = (this.infectiousCount() + immigrantsInfectious) /
                                  (this.populationCount() + immigrantsPopulation);
      if(config.infectionFunction == 0) {
        prob_q = 1 - Math.exp(-prob * infectivePercentage);
      } else if (config.infectionFunction == 1) {
        prob_q = prob * infectivePercentage;
      }

      // move people between states in the backward order
      for (var i = this.statesCount.length - 2; i >= 0; i--) {
        if (i === 0) {
          // randomization
          var infectionProb = randomizeProbWithNormalDistribution(prob_q, config.varCoeff);
          var infectiousTodayInCell = Math.floor(this.susceptibleCount() * infectionProb);
          this.statesCount[i + 1] += infectiousTodayInCell;
          this.statesCount[i] -= infectiousTodayInCell;
        } else {
          this.statesCount[i + 1] += this.statesCount[i];
          this.statesCount[i] = 0;
        }
        // advance state of immigrants, because they will get back to their cells
        // after infections are simulated
        for (var j in immigrants) {
          if (i === 0) {
            var infectiousTodayImmigrantCell = Math.round(immigrants[j].susceptibleCount() *
                                                        infectionProb);
            immigrants[j].statesCount[i + 1] += infectiousTodayImmigrantCell;
            immigrants[j].statesCount[i] -= infectiousTodayImmigrantCell;
          } else {
            immigrants[j].statesCount[i + 1] += immigrants[j].statesCount[i];
            immigrants[j].statesCount[i] = 0;
          }
        }
      }
    }
  };

  this.susceptibleCount = function() {
    return this.statesCount[0];
  };

  this.setSusceptibleCount = function(value) {
    this.statesCount[0] = value;
  };

  this.recoveredCount = function() {
    return this.statesCount[config.recoveredIndex];
  };

  this.incubatedCount = function() {
    return _.reduce(this.statesCount.slice(config.incubatedIndex, config.incubatedIndex + config.incubatedDays),
                    function(memo, num) {
                      return memo + num;
                    }, 0);
  };

  this.infectiousCount = function() {
    return _.reduce(this.statesCount.slice(config.infectiousIndex, config.infectiousIndex + config.infectiousDays),
                    function(memo, num) {
                      return memo + num;
                    }, 0);
  };

  this.populationCount = function() {
    return _.reduce(this.statesCount,
                    function(memo, num) {
                      return memo + num;
                    }, 0);
  };

  this.addNewIncubated = function(value) {
    if (value <= this.statesCount[0]) {
      this.statesCount[0] -= value;
      this.statesCount[1] += value;
    }
  };
}

