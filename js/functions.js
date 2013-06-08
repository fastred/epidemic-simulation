// Shuffles array
function shuffle(array) {
    var tmp, current, top = array.length;
    if(top) while(--top) {
      current = Math.floor(Math.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
    return array;
}

function makeArrayOf(value, length) {
  var arr = [], i = length;
  while (i--) {
    arr[i] = value;
  }
  return arr;
}

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function randomizeProbWithNormalDistribution(mu, varCoeff) {
  var stddev = mu*varCoeff;
  var prob = normal_random(mu, stddev*stddev);
  if (prob > 1) {
    prob = 1;
  }
  if (prob < 0) {
    prob = 0;
  }
  return prob;
}

function normal_random(mean, variance) {
  if (mean == undefined)
    mean = 0.0;
  if (variance == undefined)
    variance = 1.0;
  var V1, V2, S;
  do {
    var U1 = Math.random();
    var U2 = Math.random();
    V1 = 2 * U1 - 1;
    V2 = 2 * U2 - 1;
    S = V1 * V1 + V2 * V2;
  } while (S > 1);

  X = Math.sqrt(-2 * Math.log(S) / S) * V1;
//  Y = Math.sqrt(-2 * Math.log(S) / S) * V2;
  X = mean + Math.sqrt(variance) * X;
//  Y = mean + Math.sqrt(variance) * Y ;
  return X;
  }

function numberWithThousandsFormatted(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function debug(msg) {
  if (document.URL.indexOf("localhost") !== -1) {
    console.log(msg);
  }
}
