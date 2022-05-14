webapp.viewData = {};
webapp.geoJSONData = {};
webapp.features = [];

webapp.init = function () {
	const unimelb = { lat: -37.797702, lng: 144.961029 };
	webapp.map = new google.maps.Map(document.getElementById('map'), {
		zoom: 8,
		center: unimelb,
	});
	webapp.map.data.setStyle({
		fillColor: 'blue',
		strokeWeight: 1
	});
	webapp.map.data.addListener('mouseover', function (event) {
		const prop = webapp.viewData[webapp.sa][webapp.design][webapp.view];
		let percent = -10;
		if (prop[getName(event.feature)]) {
			percent = ((prop[getName(event.feature)].value - prop.valueMin) /
				(prop.valueMax - prop.valueMin)) * 100;
		}
		document.getElementById("data-caret").style.display = "block";
		document.getElementById("data-caret").style.paddingLeft = percent + "%";
		let pos = { x: event.domEvent.clientX, y: event.domEvent.clientY };
		let value;
		if (prop[getName(event.feature)]) {
			value = prop[getName(event.feature)].value;
		}
		value = value ? value.toFixed(3) : '';
		showTooltip(getName(event.feature) + ' ' + value, pos);
	});
	webapp.map.data.addListener('mouseout', hideTooltip);
	document.getElementById('saSelector').addEventListener('change', webapp.init);
	document.getElementById('designSelector').addEventListener('change', webapp.colourAreas);
	webapp.show();
};

webapp.show = function () {
	webapp.sa = document.getElementById('saSelector').selectedOptions[0].value;
	webapp.showAreas();
	webapp.colourAreas();
};

webapp.showAreas = async function () {
	await fetchGeoJSON();
	webapp.features = webapp.map.data.addGeoJson(webapp.geoJSONData[webapp.sa],
		{ idPropertyName: "name" });
}

webapp.colourAreas = async function () {
	await fetchView();
	webapp.map.data.setStyle(function (feature) {
		const name = getName(feature);
		const prop = webapp.viewData[webapp.sa][webapp.design][webapp.view];
		let opa = 0.2;
		let color = 'grey';
		if (prop[name]) {
			const low = [5, 69, 54]; // color of smallest datum
			const high = [151, 83, 34]; // color of largest datum
			// delta represents where the value sits between the min and max
			const delta =
				(prop[name].value - prop.valueMin) /
				(prop.valueMax - prop.valueMin);
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
			strokeWeight: 1
		}
	});
};

function getName(feature) {
	return feature.j.name;
}

function showTooltip(text, pos) {
	let tt = document.getElementById('tooltip');
	let ttt = document.getElementById('tooltiptext');
	tt.style.left = pos.x + 'px';
	tt.style.top = pos.y + 'px';
	ttt.innerHTML = text;
	ttt.style.visibility = 'visible';
}

function hideTooltip() {
	let tt = document.getElementById('tooltiptext');
	tt.style.visibility = 'hidden';
}

async function fetchGeoJSON() {
	if (webapp.geoJSONData[webapp.sa]) {
		return;
	}
	webapp.geoJSONData[webapp.sa] = await fetch(webapp.geoJSON(webapp.sa)).then(r => r.json());
}

async function fetchView() {
	webapp.design = document.getElementById('designSelector').selectedOptions[0].value;
	webapp.view = 'sa_sum_count';
	if (webapp.viewData[webapp.sa] && webapp.viewData[webapp.sa][webapp.design] &&
		webapp.viewData[webapp.sa][webapp.design][webapp.view]) {
		return;
	}
	let r = await fetch(webapp.viewURL(webapp.design, webapp.view, webapp.sa), {
		headers: { 'Authorization': 'Basic ' + btoa('admin:admin') }
	});
	let data = await r.json();
	data = data.rows.map(r => ({ k: r.key[r.key.length - 1], v: r.value.sum / r.value.count }));
	// data.sort((o1, o2) => o1.v - o2.v);
	webapp.viewData[webapp.sa] = webapp.viewData[webapp.sa] || {};
	webapp.viewData[webapp.sa][webapp.design] = webapp.viewData[webapp.sa][webapp.design] || {};
	webapp.viewData[webapp.sa][webapp.design][webapp.view] = {};
	let avg = webapp.viewData[webapp.sa][webapp.design][webapp.view];
	avg.valueMin = Number.MAX_VALUE,
		avg.valueMax = -Number.MAX_VALUE;
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
