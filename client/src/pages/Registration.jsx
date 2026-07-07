import { useState, useMemo } from 'react'
import { saveRegistration } from '../lib/registration'
import { GoogleTranslateWidget } from '../translation'

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

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/
const LOCATION_TEXT_REGEX = /^[A-Za-z][A-Za-z\s.,'-]*$/

function isValidLocationText(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return false
  if (!/[A-Za-z]/.test(trimmed)) return false
  if (/^[0-9\s.,'-]+$/.test(trimmed)) return false
  return LOCATION_TEXT_REGEX.test(trimmed)
}

const STEPS = [
  { id: 'identity', label: 'Identity', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0' },
  { id: 'location', label: 'Location', icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z' },
  { id: 'farm', label: 'Farm', icon: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' },
  { id: 'satellite', label: 'Satellite', icon: 'M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z' },
]

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

export default function Registration({ session, onComplete, onSignOut }) {
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [mobileTouched, setMobileTouched] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')

  const [form, setForm] = useState({
    farmerName: session?.name || '',
    mobile: session?.mobile || '',
    aadhaar: '',
    preferredLanguage: '',
    village: '',
    district: '',
    state: '',
    latitude: null,
    longitude: null,
    landArea: '',
    landUnit: 'acre',
    primaryCrop: '',
    cropStage: '',
    satelliteConsent: true,
    marketPreference: 'mandi',
  })

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

  // Compute progress
  const progress = useMemo(() => {
    let filled = 0
    let total = 10
    if (form.farmerName.trim()) filled++
    if (form.aadhaar.length === 12) filled++
    if (form.preferredLanguage) filled++
    if (form.village?.trim()) filled++
    if (form.district?.trim()) filled++
    if (form.state?.trim()) filled++
    if (INDIAN_MOBILE_REGEX.test(form.mobile)) filled++
    if (form.primaryCrop) filled++
    if (form.cropStage) filled++
    if (form.latitude) filled++
    return Math.round((filled / total) * 100)
  }, [form])

  function getValidationErrors() {
    const errs = []
    if (!form.aadhaar.trim()) errs.push('Aadhaar number is required.')
    else if (form.aadhaar.length !== 12) errs.push('Aadhaar must be 12 digits.')
    if (!INDIAN_MOBILE_REGEX.test(form.mobile)) {
      errs.push('Enter a valid 10-digit Indian mobile number.')
    }
    if (!form.preferredLanguage) errs.push('Please select preferred language.')
    if (!isValidLocationText(form.village)) errs.push('Enter a valid village name.')
    if (!isValidLocationText(form.district)) errs.push('Enter a valid district name.')
    if (!isValidLocationText(form.state)) errs.push('Enter a valid state name.')
    if (form.landArea !== '' && (isNaN(Number(form.landArea)) || Number(form.landArea) <= 0))
      errs.push('Enter a valid land area.')
    if (!form.primaryCrop) errs.push('Primary crop is required.')
    if (!form.cropStage) errs.push('Current crop stage is required.')
    return errs
  }

  const [locating, setLocating] = useState(false)

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

  async function handleUseLocation() {
    setLocating(true)
    setSubmitError('')
    setLocationMessage('')

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

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError('')
    setMobileTouched(true)
    const errs = getValidationErrors()
    if (errs.length) {
      setSubmitError(errs[0])
      return
    }
    const userId = session?.id
    if (!userId) {
      setSubmitError('Please sign in again.')
      return
    }
    setSubmitting(true)
    const result = await saveRegistration(userId, {
      ...form,
      mobile: form.mobile || null,
      marketPreference: 'mandi',
      landArea: form.landArea === '' ? null : form.landArea,
    })
    setSubmitting(false)
    if (!result.ok) {
      setSubmitError('Something went wrong. Please try again.')
      return
    }
    onComplete()
  }

  function goStep(idx) {
    setCurrentStep(idx)
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen min-h-[100dvh] relative overflow-x-hidden bg-[#fafaf8]">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-50 to-transparent" />
        <div className="absolute top-20 left-[-10%] w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-[-10%] w-[400px] h-[400px] bg-amber-100/30 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-stone-200/60">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
              <img src="/tea.png" alt="Cropwise" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover shadow-sm shrink-0" />
              <span className="font-bold text-stone-800 text-xs sm:text-sm truncate">Cropwise</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <GoogleTranslateWidget />
              <button
                type="button"
                onClick={onSignOut}
                className="px-2.5 py-1.5 sm:px-3 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium transition-colors whitespace-nowrap min-h-[36px]"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-stone-100">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {/* Step indicators */}
        <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 pb-2 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[280px] sm:min-w-0 gap-0.5">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                onClick={() => goStep(i)}
                className={`flex flex-col items-center gap-1 sm:gap-1.5 transition-all duration-300 flex-1 min-w-0 max-w-[72px] sm:max-w-none ${
                  i === currentStep
                    ? 'scale-105'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                  i === currentStep
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 text-white'
                    : i < currentStep
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-stone-100 text-stone-400'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                  </svg>
                </div>
                <span className={`text-[9px] sm:text-[10px] font-semibold tracking-wide truncate w-full text-center ${
                  i === currentStep ? 'text-emerald-700' : 'text-stone-400'
                }`}>{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-24 min-w-0">
          <form onSubmit={handleSubmit}>
            {submitError && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-scale-in flex items-center gap-2" role="alert">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                </svg>
                {submitError}
              </div>
            )}

            {/* Step 0: Identity */}
            {currentStep === 0 && (
              <div className="space-y-4 animate-slide-up">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-800">Basic identity</h2>
                  <p className="text-stone-500 text-xs sm:text-sm mt-1">Let's start with who you are</p>
                </div>

                <div className="rounded-xl sm:rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 sm:p-5 space-y-4 sm:space-y-5">
                  <div>
                    <Label>Farmer name</Label>
                    <input
                      type="text"
                      value={form.farmerName}
                      onChange={(e) => update('farmerName', e.target.value)}
                      placeholder="Your name"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <Label required>Aadhaar number</Label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.aadhaar}
                      onChange={(e) => update('aadhaar', aadhaarNumericOnly(e.target.value))}
                      placeholder="12-digit Aadhaar number"
                      maxLength={12}
                      className="input-field"
                    />
                    <p className="mt-2 text-xs text-stone-400 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v.01M12 12a1.5 1.5 0 001.11-2.5A1.5 1.5 0 0012 8.5 1.5 1.5 0 0010.89 9.5 1.5 1.5 0 0012 12z" />
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                      Used only for identity verification and government scheme eligibility.
                    </p>
                  </div>
                  <div>
                    <Label required>Mobile number</Label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.mobile}
                      onChange={(e) => update('mobile', mobileOnly(e.target.value))}
                      onBlur={() => setMobileTouched(true)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className={`input-field ${mobileError ? 'border-red-300 focus:ring-red-400 focus:border-red-400' : ''}`}
                    />
                    {mobileError && (
                      <p className="mt-2 text-xs text-red-600 font-medium">{mobileError}</p>
                    )}
                  </div>
                  <div>
                    <Label required>Preferred language</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {LANGUAGES.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => update('preferredLanguage', o.value)}
                          className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 border-2 ${
                            form.preferredLanguage === o.value
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileTouched(true)
                    if (!INDIAN_MOBILE_REGEX.test(form.mobile)) {
                      setSubmitError('Enter a valid 10-digit Indian mobile number.')
                      return
                    }
                    setSubmitError('')
                    goStep(1)
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
                >
                  Continue to Location
                </button>
              </div>
            )}

            {/* Step 1: Location */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-slide-up">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-800">Your location</h2>
                  <p className="text-stone-500 text-xs sm:text-sm mt-1">Powers weather alerts, mandi prices, and satellite monitoring</p>
                </div>

                <div className="rounded-xl sm:rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 sm:p-5 space-y-4 sm:space-y-5">
                  {/* GPS button */}
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={locating}
                    className={`w-full py-4 rounded-xl border-2 font-bold transition-all duration-300 flex items-center justify-center gap-3 ${
                      form.latitude
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-dashed border-red-300 bg-red-50/50 text-red-600 hover:bg-red-50 hover:border-red-400'
                    } disabled:opacity-60`}
                  >
                    {locating ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Detecting location...
                      </>
                    ) : form.latitude ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Detect my location
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
                    <p className={`text-xs font-medium ${locationMessage.includes('Could not') || locationMessage.includes('not available') || locationMessage.includes('failed') ? 'text-amber-700' : 'text-emerald-600'}`}>
                      {locationMessage}
                    </p>
                  )}

                  {form.latitude && form.longitude && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 font-mono">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label required>Village</Label>
                      <input type="text" value={form.village} onChange={(e) => update('village', e.target.value)} placeholder="Village" className="input-field" />
                    </div>
                    <div>
                      <Label required>District</Label>
                      <input type="text" value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="District" className="input-field" />
                    </div>
                    <div>
                      <Label required>State</Label>
                      <input type="text" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="State" className="input-field" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <button type="button" onClick={() => goStep(0)} className="flex-1 py-3.5 sm:py-4 rounded-xl border-2 border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all text-sm sm:text-base min-h-[44px]">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const locErrs = []
                      if (!isValidLocationText(form.village)) locErrs.push('Enter a valid village name.')
                      if (!isValidLocationText(form.district)) locErrs.push('Enter a valid district name.')
                      if (!isValidLocationText(form.state)) locErrs.push('Enter a valid state name.')
                      if (locErrs.length) {
                        setSubmitError(locErrs[0])
                        return
                      }
                      setSubmitError('')
                      goStep(2)
                    }}
                    className="flex-[2] py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all text-sm sm:text-base min-h-[44px]"
                  >
                    Continue to Farm
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Farm */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-slide-up">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-800">Farm details</h2>
                  <p className="text-stone-500 text-xs sm:text-sm mt-1">Help us understand your farm</p>
                </div>

                <div className="rounded-xl sm:rounded-2xl bg-white border border-stone-200/80 shadow-sm p-4 sm:p-5 space-y-4 sm:space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Land area</Label>
                      <input type="text" inputMode="decimal" value={form.landArea} onChange={(e) => update('landArea', landAreaNumeric(e.target.value))} placeholder="e.g. 2.5" className="input-field" />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <div className="flex gap-2 mt-0">
                        {LAND_UNITS.map((u) => (
                          <button
                            key={u.value}
                            type="button"
                            onClick={() => update('landUnit', u.value)}
                            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                              form.landUnit === u.value
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {CROPS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => update('primaryCrop', c.value)}
                          className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                            form.primaryCrop === c.value
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
                          onClick={() => update('cropStage', s.value)}
                          className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                            form.cropStage === s.value
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <button type="button" onClick={() => goStep(1)} className="flex-1 py-3.5 sm:py-4 rounded-xl border-2 border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all text-sm sm:text-base min-h-[44px]">
                    Back
                  </button>
                  <button type="button" onClick={() => goStep(3)} className="flex-[2] py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/25 transition-all text-sm sm:text-base min-h-[44px]">
                    Continue to Satellite
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Satellite */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-slide-up">
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-stone-800">SAR Satellite Monitoring</h2>
                  <p className="text-stone-500 text-xs sm:text-sm mt-1">Our core technology — powered by government SAR satellites</p>
                </div>

                <div className="rounded-2xl overflow-hidden border-2 border-teal-300 shadow-lg">
                  <div className="px-6 py-5 bg-gradient-to-r from-teal-700 via-emerald-700 to-green-700 text-white relative overflow-hidden">
                    {/* Radar animation */}
                    <div className="absolute top-1/2 right-6 -translate-y-1/2 w-24 h-24 opacity-20">
                      <div className="absolute inset-0 rounded-full border-2 border-white/30" />
                      <div className="absolute inset-2 rounded-full border border-white/20" />
                      <div className="absolute inset-4 rounded-full border border-white/10" />
                      <div className="absolute inset-0 origin-center animate-radar">
                        <div className="w-1/2 h-0.5 bg-gradient-to-r from-white/60 to-transparent mt-[calc(50%-1px)]" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold">Core MVP Feature</h3>
                    <p className="text-teal-100 text-sm mt-1">Works through clouds, day and night</p>
                  </div>
                  <div className="p-5 bg-gradient-to-b from-teal-50 to-white space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: '🌧️', title: 'Soil moisture', desc: 'Estimation' },
                        { icon: '🚜', title: 'Flood detection', desc: 'Waterlogging alerts' },
                        { icon: '🌱', title: 'Crop growth', desc: 'Consistency tracking' },
                        { icon: '⏱️', title: 'Sowing dates', desc: 'Govt. validation' },
                      ].map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-teal-200 hover-lift">
                          <span className="text-2xl">{f.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-stone-800">{f.title}</p>
                            <p className="text-xs text-stone-500">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      onClick={() => update('satelliteConsent', !form.satelliteConsent)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                        form.satelliteConsent
                          ? 'bg-teal-100 border-2 border-teal-400'
                          : 'bg-stone-50 border-2 border-stone-200'
                      }`}
                    >
                      <div className={`w-12 h-7 rounded-full p-0.5 transition-all duration-300 ${
                        form.satelliteConsent ? 'bg-teal-500' : 'bg-stone-300'
                      }`}>
                        <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                          form.satelliteConsent ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                      <div>
                        <p className="font-bold text-stone-800">Enable satellite crop monitoring</p>
                        <p className="text-xs text-stone-500 mt-0.5">No images of people or houses. Only agricultural data.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Completion summary */}
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-stone-800">Profile completion</p>
                    <span className="text-sm font-bold text-emerald-600">{progress}%</span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <button type="button" onClick={() => goStep(2)} className="flex-1 py-3.5 sm:py-4 rounded-xl border-2 border-stone-200 text-stone-600 font-bold hover:bg-stone-50 transition-all text-sm sm:text-base min-h-[44px]">
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 transition-all duration-300 relative overflow-hidden group min-h-[44px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        Saving...
                      </span>
                    ) : 'Complete registration'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
