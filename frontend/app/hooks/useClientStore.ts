'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ClientInfo } from '../types'
import { API_BASE } from '../config'

export function useClientStore() {
  const [clients, setClients] = useState<ClientInfo[]>([])
  const [activeClientId, setActiveClientId] = useState<string>('demo')

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clients`)
      const data: ClientInfo[] = await res.json()
      setClients(data)
    } catch {
      setClients([{ id: 'demo', name: 'SolarShield Immune+ (Demo)', is_demo: true }])
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const addClient = useCallback((client: ClientInfo) => {
    setClients((prev) => [...prev, client])
    setActiveClientId(client.id)
  }, [])

  return { clients, activeClientId, setActiveClientId, addClient, refreshClients: fetchClients }
}
