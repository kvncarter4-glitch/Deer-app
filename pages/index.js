import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const HuntMap = dynamic(() => import('../components/HuntMap'), { ssr: false })

export default function Home() {
  const [address, setAddress] = useState('High Point, NC')
  const [coords, setCoords] = useState({ lat: 35.9557, lon: -80.0053 })
  const [suggestion, setSuggestion] = useState('')
  const [meta, setMeta] = useState({ elevation: null, wind: null, temp: null, wcode: null })
  const [pins, setPins] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  async function geocode(query) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', North Carolina')}&limit=1`, { headers: { 'Accept-Language': 'en' } })
    const data = await res.json()
    if (!data || !data[0]) throw new Error('No results')
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  }

  async function getWeather(lat, lon) {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=pressure_msl,temperature_2m,windspeed_10m,winddirection_10m`)
    const data = await res.json()
    const c = data.current_weather || {}
    return { temp: c.temperature, windspeed: c.windspeed, winddir: c.winddirection, wcode: c.weathercode }
  }

  async function getElevation(lat, lon) {
    // demo-friendly free endpoint
    const res = await fetch(`https://api.opentopodata.org/v1/test-dataset?locations=${lat},${lon}`)
    const data = await res.json()
    const elev = data?.results?.[0]?.elevation ?? null
    return elev
  }

  function computePins(lat, lon, weather, elevation) {
    const pins = []
    let text = ''

    const wcode = weather?.wcode ?? 1
    const winddir = weather?.winddir ?? 180

    const dLat = 0.01
    const dLon = 0.01

    if (wcode < 2) {
      text = 'Clear/calm: hunt transition zones, creek edges, and leeward ridges.'
      pins.push({ lat: lat + dLat, lon: lon - dLon, note: 'Creek edge stand (transition)' })
      pins.push({ lat: lat - dLat, lon: lon + dLon, note: 'Leeward ridge oak flat' })
    } else if (wcode <= 45) {
      text = 'Overcast/light rain: better daytime movement; focus on food edges and saddles.'
      pins.push({ lat: lat + dLat*1.5, lon: lon, note: 'Ridge saddle stand' })
      pins.push({ lat: lat - dLat*1.2, lon: lon - dLon*0.8, note: 'Field/oak edge' })
    } else {
      text = 'Heavy precip: deer hold tight; hunt thickets and sheltered hollows.'
      pins.push({ lat: lat + dLat*0.7, lon: lon + dLon*1.2, note: 'Pine thicket' })
    }

    if (elevation != null) {
      if (elevation > 350) {
        text += ' Higher elevation: prioritize south-facing slopes and mast sources.'
      } else {
        text += ' Lowlands: focus on creek crossings and brushy edges.'
      }
    }

    // Wind-aware tweak: position one pin upwind so your approach is downwind of expected movement
    const r = 0.012
    const rad = (Math.PI / 180) * (winddir + 180) // place downwind of wind direction
    pins.push({ lat: lat + r * Math.cos(rad), lon: lon + r * Math.sin(rad), note: 'Wind-safe access pin' })

    return { pins, text }
  }

  async function analyze(at) {
    try {
      setLoading(true)
      const { lat, lon } = at ? at : await geocode(address)
      setCoords({ lat, lon })

      const [weather, elevation] = await Promise.all([getWeather(lat, lon), getElevation(lat, lon)])
      const { pins, text } = computePins(lat, lon, weather, elevation)
      setPins(pins)
      setSuggestion(text)
      setMeta({ elevation, wind: weather?.windspeed, temp: weather?.temp, wcode: weather?.wcode })
    } catch (e) {
      console.error(e)
      setSuggestion('Could not analyze this location. Try a nearby landmark or town name.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial analyze
    analyze({ lat: coords.lat, lon: coords.lon })
    // Hourly refresh
    timerRef.current = setInterval(() => analyze({ lat: coords.lat, lon: coords.lon }), 60 * 60 * 1000)
    return () => clearInterval(timerRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="container">
      <div className="header">
        <div className="brand">Carters Deer Guide – NC Whitetail Analyzer</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row">
          <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Type an address or place in NC (e.g., Uwharrie National Forest)" />
          <button className="button" onClick={() => analyze()} disabled={loading}>{loading ? 'Analyzing…' : 'Analyze'}</button>
        </div>
        {suggestion && (
          <div className="panel" style={{ marginTop: 12 }}>
            <strong>Suggested Focus:</strong> {suggestion}
            <div className="small">Elevation: {meta.elevation ?? '—'} ft · Temp: {meta.temp ?? '—'}°C · Wind: {meta.wind ?? '—'} km/h · Code: {meta.wcode ?? '—'}</div>
          </div>
        )}
      </div>

      <div className="mapwrap" style={{ marginTop: 12 }}>
        <HuntMap center={[coords.lat, coords.lon]} pins={pins} />
      </div>

      <div className="attribution">
        Map data © OpenStreetMap contributors · Tiles © OpenTopoMap (CC-BY-SA) · Weather © Open-Meteo · Elevation © OpenTopoData
      </div>

      <div className="footer">Tip: Try different winds or times of day and re-run. Add your own pins in future versions.</div>
    </div>
  )
}