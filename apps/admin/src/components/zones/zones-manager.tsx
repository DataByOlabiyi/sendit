'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface City {
  id: string
  name: string
  state: string
  country: string
  is_active: boolean
  lat: number | null
  lng: number | null
  created_at: string
}

interface Zone {
  id: string
  city_id: string
  name: string
  base_fee: number | null
  per_km_fee: number | null
  is_active: boolean
  created_at: string
}

function fmt(kobo: number | null) {
  if (kobo === null || kobo === undefined) return '—'
  return `₦${(kobo / 100).toLocaleString('en-NG')}`
}

async function apiPost(body: Record<string, unknown>) {
  const res = await fetch('/api/zones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Request failed')
  return data
}

export function ZonesManager({ cities: initial, zones: initialZones }: { cities: City[]; zones: Zone[] }) {
  const [cities, setCities] = useState(initial)
  const [zones, setZones] = useState(initialZones)
  const [selectedCityId, setSelectedCityId] = useState<string | null>(initial[0]?.id ?? null)
  const [showAddCity, setShowAddCity] = useState(false)
  const [showAddZone, setShowAddZone] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [loading, setLoading] = useState(false)

  const [cityForm, setCityForm] = useState({ name: '', state: '', country: 'Nigeria', lat: '', lng: '' })
  const [zoneForm, setZoneForm] = useState({ name: '', base_fee: '', per_km_fee: '' })

  const selectedCity = cities.find((c) => c.id === selectedCityId)
  const cityZones = zones.filter((z) => z.city_id === selectedCityId)

  async function handleToggleCity(city: City) {
    try {
      await apiPost({ action: 'toggle_city', cityId: city.id, isActive: !city.is_active })
      setCities((prev) => prev.map((c) => c.id === city.id ? { ...c, is_active: !city.is_active } : c))
      toast.success(city.is_active ? 'City deactivated' : 'City activated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update city')
    }
  }

  async function handleAddCity() {
    if (!cityForm.name.trim() || !cityForm.state.trim()) {
      toast.error('Name and state are required')
      return
    }
    setLoading(true)
    try {
      const result = await apiPost({
        action: 'create_city',
        name: cityForm.name.trim(),
        state: cityForm.state.trim(),
        country: cityForm.country.trim() || 'Nigeria',
        lat: cityForm.lat ? parseFloat(cityForm.lat) : undefined,
        lng: cityForm.lng ? parseFloat(cityForm.lng) : undefined,
      })
      setCities((prev) => [...prev, result.city])
      setSelectedCityId(result.city.id)
      setCityForm({ name: '', state: '', country: 'Nigeria', lat: '', lng: '' })
      setShowAddCity(false)
      toast.success('City added')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add city')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddZone() {
    if (!zoneForm.name.trim() || !selectedCityId) {
      toast.error('Zone name is required')
      return
    }
    setLoading(true)
    try {
      const result = await apiPost({
        action: 'create_zone',
        cityId: selectedCityId,
        name: zoneForm.name.trim(),
        base_fee: zoneForm.base_fee ? Math.round(parseFloat(zoneForm.base_fee) * 100) : undefined,
        per_km_fee: zoneForm.per_km_fee ? Math.round(parseFloat(zoneForm.per_km_fee) * 100) : undefined,
      })
      setZones((prev) => [...prev, result.zone])
      setZoneForm({ name: '', base_fee: '', per_km_fee: '' })
      setShowAddZone(false)
      toast.success('Zone added')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add zone')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateZone() {
    if (!editingZone) return
    setLoading(true)
    try {
      await apiPost({
        action: 'update_zone',
        zoneId: editingZone.id,
        name: zoneForm.name.trim() || editingZone.name,
        base_fee: zoneForm.base_fee ? Math.round(parseFloat(zoneForm.base_fee) * 100) : null,
        per_km_fee: zoneForm.per_km_fee ? Math.round(parseFloat(zoneForm.per_km_fee) * 100) : null,
      })
      setZones((prev) => prev.map((z) => z.id === editingZone.id ? {
        ...z,
        name: zoneForm.name.trim() || z.name,
        base_fee: zoneForm.base_fee ? Math.round(parseFloat(zoneForm.base_fee) * 100) : null,
        per_km_fee: zoneForm.per_km_fee ? Math.round(parseFloat(zoneForm.per_km_fee) * 100) : null,
      } : z))
      setEditingZone(null)
      toast.success('Zone updated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update zone')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleZone(zone: Zone) {
    try {
      await apiPost({ action: 'update_zone', zoneId: zone.id, is_active: !zone.is_active })
      setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, is_active: !zone.is_active } : z))
      toast.success(zone.is_active ? 'Zone deactivated' : 'Zone activated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update zone')
    }
  }

  function openEditZone(zone: Zone) {
    setEditingZone(zone)
    setZoneForm({
      name: zone.name,
      base_fee: zone.base_fee ? String(zone.base_fee / 100) : '',
      per_km_fee: zone.per_km_fee ? String(zone.per_km_fee / 100) : '',
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cities column */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Cities</h2>
            <button
              onClick={() => setShowAddCity(true)}
              className="text-xs font-medium text-orange-500 hover:text-orange-700"
            >
              + Add City
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {cities.length === 0 ? (
              <p className="text-sm text-gray-400 p-5">No cities configured</p>
            ) : (
              cities.map((city) => (
                <div
                  key={city.id}
                  className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition ${
                    selectedCityId === city.id ? 'bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCityId(city.id)}
                >
                  <div>
                    <p className={`text-sm font-medium ${selectedCityId === city.id ? 'text-orange-600' : 'text-gray-900'}`}>
                      {city.name}
                    </p>
                    <p className="text-xs text-gray-400">{city.state}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${city.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {city.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleCity(city) }}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1"
                    >
                      {city.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showAddCity && (
          <div className="mt-4 bg-white rounded-2xl border border-orange-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Add City</h3>
            {[
              { label: 'City Name *', key: 'name', placeholder: 'e.g. Abuja' },
              { label: 'State *', key: 'state', placeholder: 'e.g. FCT' },
              { label: 'Country', key: 'country', placeholder: 'Nigeria' },
              { label: 'Latitude', key: 'lat', placeholder: '9.0765' },
              { label: 'Longitude', key: 'lng', placeholder: '7.3986' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type="text"
                  value={cityForm[key as keyof typeof cityForm]}
                  onChange={(e) => setCityForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowAddCity(false)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddCity} disabled={loading} className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Zones column */}
      <div className="lg:col-span-2">
        {selectedCity ? (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Zones — {selectedCity.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fee overrides apply instead of platform defaults</p>
              </div>
              <button
                onClick={() => { setZoneForm({ name: '', base_fee: '', per_km_fee: '' }); setShowAddZone(true) }}
                className="text-xs font-medium text-orange-500 hover:text-orange-700"
              >
                + Add Zone
              </button>
            </div>

            {showAddZone && (
              <div className="px-5 py-4 border-b border-gray-100 bg-orange-50/40 space-y-3">
                <h3 className="text-xs font-semibold text-gray-700">New Zone</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" value={zoneForm.name} onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Victoria Island" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Base Fee (₦)</label>
                    <input type="number" value={zoneForm.base_fee} onChange={(e) => setZoneForm((f) => ({ ...f, base_fee: e.target.value }))} placeholder="Leave blank for default" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Per-km Fee (₦)</label>
                    <input type="number" value={zoneForm.per_km_fee} onChange={(e) => setZoneForm((f) => ({ ...f, per_km_fee: e.target.value }))} placeholder="Leave blank for default" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddZone(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleAddZone} disabled={loading} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">Add Zone</button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {cityZones.length === 0 ? (
                <p className="text-sm text-gray-400 p-5">No zones configured for this city</p>
              ) : (
                cityZones.map((zone) => (
                  <div key={zone.id}>
                    {editingZone?.id === zone.id ? (
                      <div className="px-5 py-4 bg-blue-50/40 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" value={zoneForm.name} onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Base Fee (₦)</label>
                            <input type="number" value={zoneForm.base_fee} onChange={(e) => setZoneForm((f) => ({ ...f, base_fee: e.target.value }))} placeholder="Clear to remove override" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Per-km Fee (₦)</label>
                            <input type="number" value={zoneForm.per_km_fee} onChange={(e) => setZoneForm((f) => ({ ...f, per_km_fee: e.target.value }))} placeholder="Clear to remove override" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingZone(null)} className="px-4 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                          <button onClick={handleUpdateZone} disabled={loading} className="px-4 py-1.5 text-xs bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{zone.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Base: {fmt(zone.base_fee)} · Per km: {fmt(zone.per_km_fee)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${zone.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {zone.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <button onClick={() => openEditZone(zone)} className="text-xs text-blue-500 hover:text-blue-700 px-1">Edit</button>
                          <button onClick={() => handleToggleZone(zone)} className="text-xs text-gray-400 hover:text-gray-600 px-1">
                            {zone.is_active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">Select a city to manage its zones</p>
          </div>
        )}
      </div>
    </div>
  )
}
