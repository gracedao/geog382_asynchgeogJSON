mapboxgl.accessToken = 'pk.eyJ1IjoiZ3JhY2VkYW8iLCJhIjoiY21oY205ejNrMGQ3YjJtb2VrOG5kOG12dyJ9.wud5N0YXnuKiAJueq01ddQ'

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [-122.3321, 47.6062],
  zoom: 11
})

async function loadData() {
  const treeResp = await fetch(window.TREE_URL)
  if (!treeResp.ok) throw new Error('Tree fetch failed ' + treeResp.status)
  const trees = await treeResp.json()

  const hoodResp = await fetch(window.NEIGHBORHOODS_URL)
  if (!hoodResp.ok) throw new Error('Neighborhoods fetch failed ' + hoodResp.status)
  const hoods = await hoodResp.json()

  map.on('load', function() {
    map.setFog({})

    map.addSource('hoods', { type: 'geojson', data: hoods })
    map.addLayer({
      id: 'hoods-fill',
      type: 'fill',
      source: 'hoods',
      paint: { 'fill-color': '#6c757d', 'fill-opacity': 0.15 }
    })
    map.addLayer({
      id: 'hoods-outline',
      type: 'line',
      source: 'hoods',
      paint: { 'line-color': '#6c757d', 'line-width': 1 }
    })

    map.addSource('trees', { type: 'geojson', data: trees })
    map.addLayer({
      id: 'trees-points',
      type: 'circle',
      source: 'trees',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['coalesce', ['to-number', ['get', 'diameter']], 0],
          0, 3,
          20, 6
        ],
        'circle-color': '#2a9d8f',
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff'
      }
    })

    const pts = (trees.features || [])
      .map(f => f && f.geometry && f.geometry.type === 'Point' ? f.geometry.coordinates : null)
      .filter(c => Array.isArray(c) && isFinite(c[0]) && isFinite(c[1]) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90)

    if (pts.length > 0) {
      const xs = pts.map(c => c[0])
      const ys = pts.map(c => c[1])
      map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 40 })
    }

    map.on('click', 'trees-points', e => {
      const p = e.features[0].properties || {}
      const idVal = p.tree_id ?? p.id ?? p.index ?? ''
      const sp = p.species ?? ''
      const dia = p.diameter ?? ''
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<b>tree_id:</b> ${idVal}<br><b>species:</b> ${sp}<br><b>diameter:</b> ${dia}`)
        .addTo(map)
    })

    map.on('mouseenter', 'trees-points', () => map.getCanvas().style.cursor = 'pointer')
    map.on('mouseleave', 'trees-points', () => map.getCanvas().style.cursor = '')
  })

  const table = document.getElementById('treeTable')
  for (let i = 0; i < (trees.features?.length || 0); i++) {
    const p = trees.features[i].properties || {}
    const idVal = p.tree_id ?? p.id ?? p.index ?? i
    const species = p.species ?? ''
    const diameter = p.diameter ?? ''
    const row = table.insertRow(-1)
    row.insertCell(0).textContent = idVal
    row.insertCell(1).textContent = species
    row.insertCell(2).textContent = diameter
  }

  document.getElementById('sortBtn').addEventListener('click', function() {
    const tableEl = document.getElementById('treeTable')
    let switching = true
    while (switching) {
      switching = false
      const rows = tableEl.rows
      for (let i = 1; i < rows.length - 1; i++) {
        const a = parseFloat(rows[i].cells[2].textContent || '0')
        const b = parseFloat(rows[i + 1].cells[2].textContent || '0')
        if (a < b) {
          rows[i].parentNode.insertBefore(rows[i + 1], rows[i])
          switching = true
          break
        }
      }
    }
  })
}

loadData()
