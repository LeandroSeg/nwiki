// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect } from 'react'
import { api } from './api'

export function useTitle(title: string) {
  useEffect(() => {
    api.getConfig().then(cfg => {
      document.title = title ? `${title} · ${cfg.siteName}` : cfg.siteName
    }).catch(() => {
      document.title = title ? `${title} · nwiki` : 'nwiki'
    })
  }, [title])
}
