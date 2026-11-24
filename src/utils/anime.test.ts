import { describe, expect, it } from 'vitest'
import { describeAiringStatus, describeAnime, getDisplayTitle, hasSameMetadata } from './anime'

describe('hasSameMetadata', () => {
  const base = {
    anilistId: 1,
    title: { romaji: 'A', english: null },
    coverUrl: null,
    format: 'TV',
    airingStatus: 'RELEASING',
    episodes: null,
    nextEpisode: 3,
  }

  it('detecta cambios en los campos que se guardan', () => {
    expect(hasSameMetadata(base, { ...base })).toBe(true)
    expect(hasSameMetadata(base, { ...base, nextEpisode: 4 })).toBe(false)
    expect(hasSameMetadata(base, { ...base, episodes: 12 })).toBe(false)
    expect(hasSameMetadata(base, { ...base, title: { romaji: 'A', english: 'B' } })).toBe(false)
  })
})

describe('describeAiringStatus', () => {
  it('traduce los estados conocidos y conserva los desconocidos', () => {
    expect(describeAiringStatus('RELEASING')).toBe('En emisión')
    expect(describeAiringStatus('OTRO')).toBe('OTRO')
    expect(describeAiringStatus(null)).toBeNull()
  })
})

describe('getDisplayTitle', () => {
  it('prefiere el título en inglés, luego el romaji y al final el id', () => {
    expect(getDisplayTitle({ anilistId: 1, title: { romaji: 'Shingeki', english: 'Attack' } })).toBe('Attack')
    expect(getDisplayTitle({ anilistId: 1, title: { romaji: 'Shingeki', english: null } })).toBe('Shingeki')
    expect(getDisplayTitle({ anilistId: 7, title: { romaji: null, english: null } })).toBe('Anime #7')
  })
})

describe('describeAnime', () => {
  it('no inventa el total de episodios cuando se desconoce', () => {
    expect(describeAnime({ format: 'TV', episodes: null })).toBe('TV · Episodios sin confirmar')
  })

  it('usa singular y plural y formatea el formato', () => {
    expect(describeAnime({ format: 'TV_SHORT', episodes: 1 })).toBe('TV SHORT · 1 episodio')
    expect(describeAnime({ format: null, episodes: 12 })).toBe('12 episodios')
  })
})
