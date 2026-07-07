import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadRegistration, updateRegistration } from '../lib/registration'
import { setLocalSession } from '../lib/supabase'
import { GoogleTranslateWidget } from '../translation'

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/
const LOCATION_TEXT_REGEX = /^[A-Za-z][A-Za-z\s.,'-]*$/

const LANGUAGES = [
  { value: 'gujarati', label: 'Gujarati' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'marathi', label: 'Marathi' },
  { value: 'telugu', label: 'Telugu' },
  { value: 'english', label: 'English' },
]

const CROPS = [
  { value: 'onion', label: 'Onion' },
  { value: 'tomato', label: 'Tomato' },
  { value: 'potato', label: 'Potato' },
]

const CROP_STAGES = [
  { value: 'sowing', label: 'Sowing' },
  { value: 'vegetative', label: 'Vegetative' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'harvest', label: 'Harvest' },
]

const LAND_UNITS = [
  { value: 'acre', label: 'Acre' },
  { value: 'hectare', label: 'Hectare' },
]

function isValidLocationText(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return false
  if (!/[A-Za-z]/.test(trimmed)) return false
  if (/^[0-9\s.,'-]+$/.test(trimmed)) return false
  return LOCATION_TEXT_REGEX.test(trimmed)
}

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function buildFormFromProfile(source, session) {
  return {
    farmer_name: source?.farmer_name || session?.name || '',
    mobile: source?.mobile || session?.mobile || '',
    aadhaar: source?.aadhaar || '',
    preferred_language: source?.preferred_language || '',
    village: source?.village || '',
    district: source?.district || '',
    state: source?.state || '',
    latitude: source?.latitude ?? null,
    longitude: source?.longitude ?? null,
    land_area:
      source?.land_area === null || source?.land_area === undefined
        ? ''
        : String(source.land_area),
    land_unit: source?.land_unit || 'acre',
    primary_crop: source?.primary_crop || '',
    crop_stage: source?.crop_stage || '',
    satellite_consent: Boolean(source?.satellite_consent),
    market_preference: 'mandi',
  }
}

export default function Profile({ session, onSignOut, onProfileUpdated }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [form, setForm] = useState(() => buildFormFromProfile(null, session))
  const [mobileTouched, setMobileTouched] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const mobileOnly = (v) => v.replace(/\D/g, '').slice(0, 10)
  const aadhaarNumericOnly = (v) => v.replace(/\D/g, '').slice(0, 12)
  const landAreaNumeric = (v) => v.replace(/[^\d.]/g, '').slice(0, 10)

  const mobileError =
    mobileTouched && form.mobile && !INDIAN_MOBILE_REGEX.test(form.mobile)
      ? 'Enter a valid 10-digit Indian mobile number'
      : mobileTouched && !form.mobile
        ? 'Enter a valid 10-digit Indian mobile number'
        : ''

  const loadProfile = useCallback(async () => {
    if (!session?.id) return
    setLoading(true)
    const data = await loadRegistration(session.id)
    setForm(buildFormFromProfile(data, session))
    setLoading(false)
  }, [session])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  async function reverseGeocode(lat, lng) {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } },
    )
    if (!res.ok) throw new Error('Geocoding failed')
    return res.json()
  }

  function parseNominatimAddress(addr = {}) {
    return {
      village:
        addr.village ||
        addr.town ||
        addr.hamlet ||
        addr.suburb ||
        addr.city ||
        addr.locality ||
        '',
      district: addr.state_district || addr.county || addr.district || '',
      state: addr.state || '',
    }
  }

  async function handleDetectLocation() {
    setLocating(true)
    setLocationMessage('')
    setSaveError('')

    if (!navigator.geolocation) {
      setLocationMessage(
        'Location detection is not available. Please enter your village, district, and state manually.',
      )
      setLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        update('latitude', lat)
        update('longitude', lng)
        try {
          const geo = await reverseGeocode(lat, lng)
          const parsed = parseNominatimAddress(geo.address)
          if (parsed.village) update('village', parsed.village)
          if (parsed.district) update('district', parsed.district)
          if (parsed.state) update('state', parsed.state)
          setLocationMessage('Location detected and fields updated. You can edit them if needed.')
        } catch {
          setLocationMessage(
            'GPS coordinates saved, but address lookup failed. Please enter your location manually.',
          )
        }
        setLocating(false)
      },
      () => {
        setLocationMessage(
          'Could not detect your location. Please enter your village, district, and state manually.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  function getValidationErrors() {
    const errs = []
    if (!form.farmer_name.trim()) errs.push('Farmer name is required.')
    if (!INDIAN_MOBILE_REGEX.test(form.mobile)) {
      errs.push('Enter a valid 10-digit Indian mobile number.')
    }
    if (!form.preferred_language) errs.push('Please select preferred language.')
    if (!isValidLocationText(form.village)) errs.push('Enter a valid village name.')
    if (!isValidLocationText(form.district)) errs.push('Enter a valid district name.')
    if (!isValidLocationText(form.state)) errs.push('Enter a valid state name.')
    if (form.land_area !== '' && (isNaN(Number(form.land_area)) || Number(form.land_area) <= 0)) {
      errs.push('Enter a valid land area.')
    }
    if (!form.primary_crop) errs.push('Primary crop is required.')
    if (!form.crop_stage) errs.push('Current crop stage is required.')
    return errs
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaveError('')
    setSaveSuccess('')
    setMobileTouched(true)

    const errs = getValidationErrors()
    if (errs.length) {
      setSaveError(errs[0])
      return
    }

    if (!session?.id) {
      setSaveError('Please sign in again.')
      return
    }

    setSaving(true)
    const parsedLandArea = Number.parseFloat(form.land_area)
    const payload = {
      farmer_name: form.farmer_name.trim() || null,
      mobile: form.mobile.trim() || null,
      aadhaar: form.aadhaar || '',
      preferred_language: form.preferred_language || null,
      village: form.village.trim() || null,
      district: form.district.trim() || null,
      state: form.state.trim() || null,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      land_area: Number.isFinite(parsedLandArea) ? parsedLandArea : null,
      land_unit: form.land_unit || null,
      primary_crop: form.primary_crop || null,
      crop_stage: form.crop_stage || null,
      satellite_consent: Boolean(form.satellite_consent),
      market_preference: 'mandi',
    }

    const { data, error } = await updateRegistration(session.id, payload)
    setSaving(false)

    if (error) {
      setSaveError(error.message || 'Failed to update profile.')
      return
    }

    const nextSession = {
      ...session,
      name: payload.farmer_name || session?.name,
      mobile: payload.mobile || session?.mobile,
    }
    setLocalSession({
      id: session.id,
      name: nextSession.name,
      mobile: nextSession.mobile,
    })
    await onProfileUpdated?.()
    setForm(buildFormFromProfile(data || payload, nextSession))
    setSaveSuccess('Profile updated successfully.')
  }

  const initials = (session?.name || 'F')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#f8faf9] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-[3px] border-stone-200 border-t-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-[#f8faf9] overflow-x-hidden">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-stone-200/60 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-stone-100 text-stone-600 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back to dashboard"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <img src="/tea.png" alt="Cropwise" className="w-8 h-8 rounded-lg object-cover shadow-sm shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-stone-800 text-sm truncate">Farm Profile</h1>
            <p className="text-[11px] text-stone-400 truncate">Edit your registration details</p>
          </div>
        </div>

        <div className="flex-1 min-w-0" />

        <div className="shrink-0 max-w-[calc(100vw-8rem)]">
          <GoogleTranslateWidget />
        </div>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0 ring-2 ring-emerald-400 ring-offset-1"
          aria-label="Profile"
          title="Profile"
        >
          {initials}
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] shrink-0"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto min-w-0">
        <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
          <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="relative z-10">
              <p className="text-emerald-200 text-sm font-medium">Your profile</p>
              <h2 className="text-2xl font-extrabold mt-1">{form.farmer_name || session?.name || 'Farmer'}</h2>
              <p className="text-emerald-100/70 text-sm mt-2">
                Update your farm details, location, and crop information.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 sm:p-6 space-y-5">
            {saveError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium" role="alert">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                {saveSuccess}
              </div>
            )}

            <div>
              <Label required>Farmer name</Label>
              <input
                type="text"
                value={form.farmer_name}
                onChange={(e) => update('farmer_name', e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <Label required>Mobile number</Label>
              <input
                type="tel"
                inputMode="numeric"
                value={form.mobile}
                onChange={(e) => update('mobile', mobileOnly(e.target.value))}
                onBlur={() => setMobileTouched(true)}
                maxLength={10}
                className={`input-field ${mobileError ? 'border-red-300 focus:ring-red-400 focus:border-red-400' : ''}`}
              />
              {mobileError && (
                <p className="mt-2 text-xs text-red-600 font-medium">{mobileError}</p>
              )}
            </div>

            <div>
              <Label>Aadhaar number</Label>
              <input
                type="text"
                inputMode="numeric"
                value={form.aadhaar}
                onChange={(e) => update('aadhaar', aadhaarNumericOnly(e.target.value))}
                maxLength={12}
                className="input-field"
              />
            </div>

            <div>
              <Label required>Preferred language</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LANGUAGES.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => update('preferred_language', o.value)}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                      form.preferred_language === o.value
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-stone-100">
              <div>
                <Label required>Location</Label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locating}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 text-emerald-700 font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {locating ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Detecting location...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      Detect my location
                    </>
                  )}
                </button>
                {locationMessage && (
                  <p className={`mt-2 text-xs font-medium ${locationMessage.includes('Could not') || locationMessage.includes('not available') || locationMessage.includes('failed') ? 'text-amber-700' : 'text-emerald-600'}`}>
                    {locationMessage}
                  </p>
                )}
                {form.latitude && form.longitude && (
                  <p className="mt-2 text-xs text-stone-500 font-mono">
                    GPS: {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label required>Village</Label>
                  <input type="text" value={form.village} onChange={(e) => update('village', e.target.value)} className="input-field" />
                </div>
                <div>
                  <Label required>District</Label>
                  <input type="text" value={form.district} onChange={(e) => update('district', e.target.value)} className="input-field" />
                </div>
                <div>
                  <Label required>State</Label>
                  <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-100">
              <div>
                <Label>Land area</Label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.land_area}
                  onChange={(e) => update('land_area', landAreaNumeric(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <div className="flex gap-2">
                  {LAND_UNITS.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => update('land_unit', u.value)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                        form.land_unit === u.value
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label required>Primary crop</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CROPS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => update('primary_crop', c.value)}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.primary_crop === c.value
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label required>Current crop stage</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CROP_STAGES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => update('crop_stage', s.value)}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.crop_stage === s.value
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              onClick={() => update('satellite_consent', !form.satellite_consent)}
              className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                form.satellite_consent
                  ? 'bg-teal-100 border-2 border-teal-400'
                  : 'bg-stone-50 border-2 border-stone-200'
              }`}
            >
              <div className={`w-12 h-7 rounded-full p-0.5 transition-all ${form.satellite_consent ? 'bg-teal-500' : 'bg-stone-300'}`}>
                <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all ${form.satellite_consent ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <div>
                <p className="font-bold text-stone-800">Satellite crop monitoring</p>
                <p className="text-xs text-stone-500 mt-0.5">Enable SAR-based farm monitoring</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
