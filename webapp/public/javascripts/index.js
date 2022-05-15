webapp.viewData = {};
webapp.geoJSONData = {};
webapp.features = [];

document.getElementById("topic").addEventListener("change", onTopicChange);
document.getElementById("designSelector").addEventListener("change",
  () => document.getElementById("topic").selectedOptions[0].value === "Geo-wise comparison" ?
    webapp.colourAreas() : drawChart());

google.charts.load("current", { packages: ["corechart"] });
// google.charts.setOnLoadCallback(drawChart);

async function myFetch(url) {
  let json = await fetch(url, {
    headers: {
      'Authorization': 'Basic ' + btoa('admin:admin'),
    },
  }).then(r => r.json());
  return json;
}

async function getHistExtremeID() {
  if (webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_max]) {
    return;
  }
  webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_max] = {};
  let url = webapp.viewURL(webapp.design, webapp.view_sa_max, webapp.sa);
  let json = await myFetch(url);
  for (var r of json.rows) {
    var name = r.key[r.key.length - 1];
    webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_max][name] = r.value.id;
  }
  webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_min] = {};
  url = webapp.viewURL(webapp.design, webapp.view_sa_min, webapp.sa);
  json = await myFetch(url);
  for (var r of json.rows) {
    var name = r.key[r.key.length - 1];
    webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_min][name] = r.value.id;
  }
}

async function getHistTwitter(id) {
  let url = webapp.server + webapp.db + '/' + id;
  let json = await myFetch(url);
  return { score: json[webapp.design + '_score'].toFixed(3), text: json.text };
}

async function getCurrTwitter(id) {
  let url = webapp.server + webapp.mel_db + '/' + id;
  let json = await myFetch(url);
  return { score: json[webapp.design + '_score'].toFixed(3), text: json.text };
}

function showTweets(area, maxT, minT) {
  document.getElementById('area').innerHTML = area;
  document.getElementById('maxT').innerHTML = "Max score: " + maxT.score + ' - ' + maxT.text;
  document.getElementById('minT').innerHTML = "Min score: " + minT.score + ' - ' + minT.text;
}

function onTopicChange() {
  let topic = document.getElementById("topic").selectedOptions[0].value;
  if (topic === "Geo-wise comparison") {
    document.getElementById("chart").style.display = "none";
    document.getElementById("map").style.display = "inline-block";
    document.getElementById("legend").style.visibility = "visible";
    document.getElementById("saSelector").style.display = "inline";
    document.getElementById("year").style.display = "inline";
    webapp.init();
  } else {
    document.getElementById("chart").style.display = "inline-block";
    document.getElementById("map").style.display = "none";
    document.getElementById("legend").style.visibility = "hidden";
    document.getElementById("saSelector").style.display = "none";
    document.getElementById("year").style.display = "none";
    drawChart();
  }
}

async function drawChart() {
  //   var data = google.visualization.arrayToDataTable([
  //     ["Year", "Visitations", { role: "style" }],
  //     ["2010", 10, "color: gray"],
  //     ["2020", 14, "color: #76A7FA"],
  //     ["2030", 16, "opacity: 0.2"],
  //     ["2040", 22, "stroke-color: #703593; stroke-width: 4; fill-color: #C5A5CF"],
  //     [
  //       "2050",
  //       28,
  //       "stroke-color: #871B47; stroke-opacity: 0.6; stroke-width: 8; fill-color: #BC5679; fill-opacity: 0.2",
  //     ],
  //   ]);

  webapp.design = document.getElementById("designSelector").selectedOptions[0].value;
  var data = google.visualization.arrayToDataTable([
    ["Year", "Average Score", { role: "style" }],
    [
      "2014-15",
      parseFloat((await fetch(webapp.hisViewURL(webapp.design), {
        headers: { Authorization: "Basic " + btoa("admin:admin") },
      }).then(r => r.json()).then(json => json.rows[0].value.sum / json.rows[0].value.count))
        .toFixed(3)),
      "stroke-color: #703593; stroke-width: 4; fill-color: #C5A5CF",
    ],
    [
      "2022",
      parseFloat((await fetch(webapp.melViewURL(webapp.design), {
        headers: { Authorization: "Basic " + btoa("admin:admin") },
      }).then(r => r.json()).then(json => json.rows[0].value.sum / json.rows[0].value.count))
        .toFixed(3)),
      "stroke-color: #76A7FA; stroke-width: 4; fill-color: #76A7FA; fill-opacity: 0.4",
    ],
  ]);

  var options = {
    title: "2014-15 vs 2022 traffic tweets sentiment comparison",
    legend: { position: 'none' },
    vAxis: {
      title: 'score',
      // ticks: [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1]
    }
  };

  var chart = new google.visualization.ColumnChart(
    document.getElementById("chart")
  );
  chart.draw(data, options);
}

webapp.init = function () {
  const unimelb = { lat: -37.797702, lng: 144.961029 };
  webapp.map = new google.maps.Map(document.getElementById("map"), {
    zoom: 8,
    center: unimelb,
  });
  webapp.map.data.setStyle({
    fillColor: "blue",
    strokeOpacity: 0,
    strokeWeight: 1,
  });
  webapp.map.data.addListener("mouseover", function (event) {
    const prop = webapp.viewData[webapp.sa][webapp.design][webapp.view_avg];
    let percent = -10;
    if (prop[getName(event.feature)]) {
      percent =
        ((prop[getName(event.feature)].value - prop.valueMin) /
          (prop.valueMax - prop.valueMin)) *
        100;
    }
    document.getElementById("data-caret").style.display = "block";
    document.getElementById("data-caret").style.paddingLeft = percent + "%";
    let pos = { x: event.domEvent.clientX, y: event.domEvent.clientY };
    let value;
    if (prop[getName(event.feature)]) {
      value = prop[getName(event.feature)].value;
    }
    value = value ? ` (${value.toFixed(3)})` : "";
    showTooltip(getName(event.feature) + value, pos);
  });
  webapp.map.data.addListener("mouseout", hideTooltip);
  webapp.map.data.addListener("click", async function (event) {
    let name = getName(event.feature);
    if (name in webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_max]) {
      let maxT = await getHistTwitter(webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_max][name]);
      let minT = await getHistTwitter(webapp.viewData[webapp.sa][webapp.design][webapp.view_sa_min][name]);
      showTweets(name, maxT, minT);
    }
  })
  webapp.show();
};
document.getElementById("saSelector").addEventListener("change", webapp.init);

webapp.show = function () {
  webapp.sa = document.getElementById("saSelector").selectedOptions[0].value;
  webapp.showAreas();
  webapp.colourAreas();
};

webapp.showAreas = async function () {
  await fetchGeoJSON();
  webapp.features = webapp.map.data.addGeoJson(webapp.geoJSONData[webapp.sa], {
    idPropertyName: "name",
  });
};

webapp.colourAreas = async function () {
  await fetchView();
  getHistExtremeID();
  webapp.map.data.setStyle(function (feature) {
    const name = getName(feature);
    const prop = webapp.viewData[webapp.sa][webapp.design][webapp.view_avg];
    let opa = 0.2;
    let color = "grey";
    if (prop[name]) {
      const low = [5, 69, 54]; // color of smallest datum
      const high = [151, 83, 34]; // color of largest datum
      // delta represents where the value sits between the min and max
      const delta =
        (prop[name].value - prop.valueMin) / (prop.valueMax - prop.valueMin);
      const hsl = [];

      for (let i = 0; i < 3; i++) {
        // calculate an integer color based on the delta
        hsl.push((high[i] - low[i]) * delta + low[i]);
      }
      color = "hsl(" + hsl[0] + "," + hsl[1] + "%," + hsl[2] + "%)";
      opa = 0.8;
    }
    return {
      fillColor: color,
      fillOpacity: opa,
      strokeOpacity: 0.3,
      strokeWeight: 1,
    };
  });
};

function getName(feature) {
  return feature.j.name;
}

function showTooltip(text, pos) {
  let tt = document.getElementById("tooltip");
  let ttt = document.getElementById("tooltiptext");
  tt.style.left = pos.x + "px";
  tt.style.top = pos.y + "px";
  ttt.innerHTML = text;
  ttt.style.visibility = "visible";
}

function hideTooltip() {
  let tt = document.getElementById("tooltiptext");
  tt.style.visibility = "hidden";
}

async function fetchGeoJSON() {
  if (webapp.geoJSONData[webapp.sa]) {
    return;
  }
  webapp.geoJSONData[webapp.sa] = await fetch(webapp.geoJSON(webapp.sa)).then(
    (r) => r.json()
  );
}

async function fetchView() {
  webapp.design = document.getElementById("designSelector").selectedOptions[0].value;
  if (
    webapp.viewData[webapp.sa] &&
    webapp.viewData[webapp.sa][webapp.design] &&
    webapp.viewData[webapp.sa][webapp.design][webapp.view_avg]
  ) {
    return;
  }
  let data = await myFetch(webapp.viewURL(webapp.design, webapp.view_avg, webapp.sa));
  data = data.rows.map((r) => ({
    k: r.key[r.key.length - 1],
    v: r.value.sum / r.value.count,
  }));
  // data.sort((o1, o2) => o1.v - o2.v);
  webapp.viewData[webapp.sa] = webapp.viewData[webapp.sa] || {};
  webapp.viewData[webapp.sa][webapp.design] =
    webapp.viewData[webapp.sa][webapp.design] || {};
  webapp.viewData[webapp.sa][webapp.design][webapp.view_avg] = {};
  let avg = webapp.viewData[webapp.sa][webapp.design][webapp.view_avg];
  (avg.valueMin = Number.MAX_VALUE), (avg.valueMax = -Number.MAX_VALUE);
  for (var i in data) {
    let value = data[i].v;
    if (value < avg.valueMin) {
      avg.valueMin = value;
    }
    if (value > avg.valueMax) {
      avg.valueMax = value;
    }
    avg[data[i].k] = { value: data[i].v, rank: i / data.length };
  }
  document.getElementById("valueMin").textContent =
    avg.valueMin.toLocaleString();
  document.getElementById("valueMax").textContent =
    avg.valueMax.toLocaleString();
}

function getColor(rank) {
  let green = rank * 255;
  let red = 255 - green;
  return `rgb(${red},${green},0)`;
}
