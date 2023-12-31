mapboxgl.accessToken = 'pk.eyJ1IjoiYXJhdmFoIiwiYSI6ImNsbWgybTBqaDBlM3EzcW85OHEwenp3YzIifQ.mpbMnWypk_KaLzVqgrcl-A'
var map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/aravah/clmqttzvo04w801p75i6o34kd',
	dragRotate: false,
	maxPitch: 0,
	minZoom: 10,
	center: [-87.63309727047887, 41.86328162863115],
	bounds: [-88.0093789998174, 41.60657118494672, -87.4360300144202, 42.08636054196859],
	fitBoundsOptions: { padding: 24 }
})
var totalDistance = 0
var nsDistance = 0
var ewDistance = 0
var diagDistance = 0
var completedDistance = 0
var nsCompleted = 0
var ewCompleted = 0
var diagCompleted = 0
let roadCount = Object.keys(streetdata).length
var selectedSortType = 'guess'
var sorters = {
	'guess': (a, b) => {
		return guessedNames.indexOf(a) - guessedNames.indexOf(b)
	},
	'alpha': (a, b) => {
		return a < b ? -1 : 1
	},
	'lenasc': (a, b) => {
		return streetdata[a].length - streetdata[b].length
	},
	'lendsc': (a, b) => {
		return -(streetdata[a].length - streetdata[b].length)
	}
}

var sortedNames = []

$('#sort').on('change', (e) => {
	selectedSortType = $('#sort').val()
	let sorter = sorters[selectedSortType]
	sortedNames = [...guessedNames]
	sortedNames.sort(sorter)
	$('#guesses').html('')
	for (street in sortedNames) {
		let name = sortedNames[street]
		let feature = streetdata[name]
		let percentage = calculatePercentage(feature.length, totalDistance)
		$('#guesses').append(`<li><div>${name}</div><div>${percentage}%</div></li>`)
	}
})

for (var street in streetdata) {
	var length = streetdata[street].length
	totalDistance += length
	if (['E', 'W'].includes(streetdata[street].direction)) {
		ewDistance += length
	} else if (['N', 'S'].includes(streetdata[street].direction)) {
		nsDistance += length
	} else {
		diagDistance += length
	}
}

var guessedNames = []
var guessedStreets = {
	'type': 'FeatureCollection',
	'features': []
}
map.on('load', () => {
	var streets = {
		'type': 'FeatureCollection',
		'features': []
	}
	for (var street in streetdata) {
		streets.features.push(...streetdata[street].features)
	}
	map.addSource('streets', {
		'type': 'geojson',
		'data': streets
	})
	map.addLayer({
		'id': 'streets',
		'type': 'line',
		'source': 'streets',
		'layout': {
			'line-join': 'round',
			'line-cap': 'round'
		},
		'paint': {
			'line-color': '#4d4d4d',
			'line-width': 1
		}
	})
	map.addSource('guessed', {
		'type': 'geojson',
		'data': guessedStreets
	})
	map.addLayer({
		'id': 'guessed',
		'type': 'line',
		'source': 'guessed',
		'layout': {
			'line-join': 'round',
			'line-cap': 'round'
		},
		'paint': {
			'line-color': '#41b6e6',
			'line-width': 2
		}
	})
	if (window.localStorage.getItem('save')) {
		let savedGuesses = window.localStorage.getItem('save').split(',')
		for (guess in savedGuesses) {
			validateGuess(savedGuesses[guess])
		}
	} else {
		window.localStorage.setItem('save', '')
		$('#count').html(`0/${roadCount} streets found`)
	}
	map.addSource('chicago', {
		'type': 'geojson',
		'data': chicago
	})
	map.addLayer({
		'id': 'chicago',
		'type': 'fill',
		'source': 'chicago',
		'paint': {
			'fill-color': '#20052e',
		}
	})
})

$('#input').keypress((event) => {
	var keycode = (event.keyCode ? event.keyCode : event.which)
	if (keycode == '13') {
		var input = $('#input').val().toUpperCase()
		$('#input').val('')
		if (validateGuess(input)) {
			window.localStorage.setItem('save', `${localStorage.getItem('save')}${input},`)
		}
	}
})

$('#submit').on('click', (e) => {
	var input = $('#input').val().toUpperCase()
	$('#input').val('')
	if (validateGuess(input)) {
		window.localStorage.setItem('save', `${localStorage.getItem('save')}${input},`)
	}
})

$('#show').on('click', (e) => {
	if ($('#show').html() == 'show roads') {
		$('#extra').show()
		$('#show').html('hide roads')
		$('#sidecard').css('height', '100%')
	} else {
		$('#extra').hide()
		$('#show').html('show roads')
		$('#sidecard').css('height', '20%')
	}
})

$('#numberedhelper').on('click', (e) => {
	for (street in streetdata) {
		if (street.match(/\d+(RD|ST|TH|ND)/g)) {
			if (validateGuess(street)) {
				window.localStorage.setItem('save', `${localStorage.getItem('save')}${street},`)
			}
		}
	}
})

$('#clear').on('click', (e) => {
	window.localStorage.setItem('save', '')
	$('#guesses').html('')
	$('#score').html('0.00%')
	$('#nsscore').html('0.00% of n/s streets')
	$('#ewscore').html('0.00% of e/w streets')
	$('#diagscore').html('0.00% of other streets')
	$('#count').html(`0/${roadCount} streets found`)
	completedDistance = 0
	nsCompleted = 0
	ewCompleted = 0
	diagCompleted = 0
	guessedNames = []
	guessedStreets.features = []
	map.getSource('guessed').setData(guessedStreets)
})

let specialNames = {
	'KING': 'DR MARTIN LUTHER KING JR',
	'IDA B WELLS': 'CONGRESS',
	'I-57': 'I57'
}

function validateGuess(guess) {
	var specialName = specialNames[guess]
	if (specialName) {
		return validateGuess(specialName)
	}
	if (guessedNames.includes(guess)) {
		return false
	}
	var feature = streetdata[guess]
	if (feature) {
		var percentage = calculatePercentage(feature.length, totalDistance)
		completedDistance += feature.length
		var completedPercentage = calculatePercentage(completedDistance, totalDistance)
		if (['E', 'W'].includes(feature.direction)) {
			ewCompleted += feature.length
			let ewPercentage = calculatePercentage(ewCompleted, ewDistance)
			$('#nsscore').html(`${ewPercentage}% of n/s streets`)
		} else if (['N', 'S'].includes(feature.direction)) {
			nsCompleted += feature.length
			let nsPercentage = calculatePercentage(nsCompleted, nsDistance)
			$('#ewscore').html(`${nsPercentage}% of e/w streets`)
		} else {
			diagCompleted += feature.length
			let diagPercentage = calculatePercentage(diagCompleted, diagDistance)
			$('#diagscore').html(`${diagPercentage}% of other streets`)
		}
		$('#score').html(`${completedPercentage}%`)
		guessedNames.push(guess)
		if (selectedSortType == 'guess') {
			$('#guesses').append(`<li><div>${guess}</div><div>${percentage}%</div></li>`)
		} else {
			let insertIndex = bisect(sortedNames, guess)
			if (insertIndex == 0) {
				sortedNames.push(guess)
				$('#guesses').append(`<li><div>${guess}</div><div>${percentage}%</div></li>`)
			} else {
				sortedNames.splice(insertIndex, 0, guess)
				$(`#guesses li:eq(${insertIndex})`).before(`<li><div>${guess}</div><div>${percentage}%</div></li>`)
			}
		}
		guessedStreets.features.push(...feature.features)
		map.getSource('guessed').setData(guessedStreets)
		$('#count').html(`${guessedNames.length}/${roadCount} streets found`)
		return true
	}
	return false
}

function bisect(array, value, low=0, high=array.length) {
	let sorter = sorters[selectedSortType]
	while(low < high) {
		let mid = (low + high) >> 1
		if (sorter(array[mid], value)) {
			high = mid
		} else {
			low = mid + 1
		}
	}
	return low
}

function calculatePercentage(portion, total) {
	var percentage = portion * 100
	percentage /= total
	return percentage.toFixed(2)
}