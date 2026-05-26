/**
 * Farm weather: OpenWeatherMap when VITE_OPENWEATHER_API_KEY is set,
 * otherwise Open-Meteo (no API key, free for non-commercial use).
 */

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const OPEN_METEO_FORECAST = 'https://api.open-meteo.com/v1/forecast'

export async function resolveFarmCoords(profile) {
  const lat = profile?.latitude
  const lon = profile?.longitude
  if (lat != null && lon != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lon))) {
    return {
      lat: Number(lat),
      lon: Number(lon),
      name: profile?.village || profile?.district || 'Your farm',
    }
  }
  const q = profile?.village || profile?.district || 'Ahmedabad'
  const res = await fetch(
    `${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
  )
  if (!res.ok) throw new Error('Location lookup failed')
  const data = await res.json()
  const r = data.results?.[0]
  if (!r) {
    throw new Error(
      `No coordinates found for "${q}". Complete registration with village/district or enable location.`,
    )
  }
  return { lat: r.latitude, lon: r.longitude, name: r.name || q }
}

function wmoDescription(code) {
  if (code === 0) return 'Clear sky'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code <= 48) return 'Fog'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Rain showers'
  if (code <= 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorm'
  return 'Weather'
}

function wmoIcon(code, day) {
  const s = day ? 'd' : 'n'
  if (code === 0 || code === 1) return `01${s}`
  if (code === 2) return `02${s}`
  if (code === 3) return `04${s}`
  if (code <= 48) return `50${s}`
  if (code <= 57) return `09${s}`
  if (code <= 67) return `10${s}`
  if (code <= 77) return `13${s}`
  if (code <= 82) return `09${s}`
  return `11${s}`
}

/** Naive ISO local time from Open-Meteo + utc_offset_seconds → unix (s). */
function meteoTimeToUnix(iso, utcOffsetSeconds) {
  if (!iso) return Math.floor(Date.now() / 1000)
  if (iso.includes('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)) {
    return Math.floor(new Date(iso).getTime() / 1000)
  }
  const o = Number(utcOffsetSeconds) || 0
  const sign = o >= 0 ? '+' : '-'
  const abs = Math.abs(o)
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0')
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0')
  return Math.floor(new Date(`${iso}${sign}${hh}:${mm}`).getTime() / 1000)
}

function mapOpenMeteoHourlyToOwmList(data) {
  const h = data.hourly
  if (!h?.time?.length) return []
  const off = data.utc_offset_seconds ?? 0
  return h.time.map((t, i) => {
    const dt = meteoTimeToUnix(t, off)
    const timePart = t.split('T')[1] || '12:00'
    const localH = parseInt(timePart.split(':')[0], 10) || 0
    const day = localH >= 6 && localH < 20
    const code = h.weather_code[i] ?? 0
    const windKmh = h.wind_speed_10m[i] ?? 0
    const precip = h.precipitation[i] ?? 0
    const popPct = h.precipitation_probability?.[i] ?? 0
    return {
      dt,
      dt_txt: t.replace('T', ' '),
      main: {
        temp: h.temperature_2m[i],
        humidity: h.relative_humidity_2m[i],
      },
      wind: { speed: windKmh / 3.6, deg: h.wind_direction_10m[i] ?? 0 },
      weather: [
        { icon: wmoIcon(code, day), description: wmoDescription(code) },
      ],
      clouds: { all: h.cloud_cover[i] ?? 0 },
      pop: popPct / 100,
      rain: precip > 0.01 ? { '3h': Math.min(precip * 3, 50) } : undefined,
    }
  })
}

function mapOpenMeteoCurrent(data, locationName) {
  const c = data.current
  const daily = data.daily
  let sunrise = Math.floor(Date.now() / 1000)
  let sunset = sunrise + 43200
  if (daily?.sunrise?.[0]) {
    sunrise = Math.floor(new Date(daily.sunrise[0]).getTime() / 1000)
  }
  if (daily?.sunset?.[0]) {
    sunset = Math.floor(new Date(daily.sunset[0]).getTime() / 1000)
  }
  const code = c.weather_code ?? 0
  const hour = new Date().getHours()
  const day = hour >= 6 && hour < 20
  return {
    coord: { lat: data.latitude, lon: data.longitude },
    name: locationName,
    main: {
      temp: c.temperature_2m,
      feels_like: c.apparent_temperature ?? c.temperature_2m,
      humidity: c.relative_humidity_2m,
      pressure: Math.round(c.pressure_msl ?? 1013),
    },
    wind: {
      speed: (c.wind_speed_10m ?? 0) / 3.6,
      deg: c.wind_direction_10m ?? 0,
    },
    clouds: { all: c.cloud_cover ?? 0 },
    visibility: 10000,
    weather: [{ icon: wmoIcon(code, day), description: wmoDescription(code) }],
    sys: { sunrise, sunset },
  }
}

async function fetchOpenMeteoBundle(profile) {
  const { lat, lon, name } = await resolveFarmCoords(profile)
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '5',
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
      'pressure_msl',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'weather_code',
      'cloud_cover',
      'wind_speed_10m',
      'wind_direction_10m',
      'precipitation',
      'precipitation_probability',
    ].join(','),
    daily: 'sunrise,sunset',
  })
  const res = await fetch(`${OPEN_METEO_FORECAST}?${params}`)
  if (!res.ok) throw new Error('Weather service unavailable (Open-Meteo).')
  const raw = await res.json()
  return {
    weather: mapOpenMeteoCurrent(raw, name),
    forecast: { list: mapOpenMeteoHourlyToOwmList(raw) },
    airQuality: null,
  }
}

async function fetchOpenWeatherBundle(profile, apiKey) {
  const lat = profile?.latitude
  const lon = profile?.longitude
  const params =
    lat != null && lon != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lon))
      ? `lat=${lat}&lon=${lon}`
      : `q=${encodeURIComponent(profile?.village || profile?.district || 'Ahmedabad')},IN`

  const [cRes, fRes] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?${params}&appid=${apiKey}&units=metric`,
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?${params}&appid=${apiKey}&units=metric`,
    ),
  ])
  if (!cRes.ok || !fRes.ok) {
    const t = await cRes.text().catch(() => '')
    throw new Error(t || 'OpenWeatherMap request failed')
  }
  const weather = await cRes.json()
  const forecast = await fRes.json()
  let airQuality = null
  const aLat = weather.coord?.lat
  const aLon = weather.coord?.lon
  if (aLat != null && aLon != null) {
    const aRes = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${aLat}&lon=${aLon}&appid=${apiKey}`,
    )
    if (aRes.ok) airQuality = await aRes.json()
  }
  return { weather, forecast, airQuality }
}

/**
 * @returns {Promise<{ weather: object, forecast: { list: array }, airQuality: object | null }>}
 */
export async function fetchFarmWeatherBundle(profile) {
  const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY?.trim()
  if (apiKey) {
    try {
      return await fetchOpenWeatherBundle(profile, apiKey)
    } catch (e) {
      console.warn('[farmWeather] OpenWeather failed, using Open-Meteo', e)
    }
  }
  return fetchOpenMeteoBundle(profile)
}
