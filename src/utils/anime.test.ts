import { describe, expect, it } from 'vitest'
import {
  coverImageUrl,
  describeAiringDates,
  describeAiringStatus,
  describeAnime,
  describePeriod,
  formatPartialDate,
  getDisplayTitle,
  hasSameMetadata,
} from './anime'

describe('formatPartialDate', () => {
  it('muestra solo lo que AniList informa', () => {
    expect(formatPartialDate({ year: 2023, month: 9, day: 29 })).toBe('29 sep 2023')
    expect(formatPartialDate({ year: 2023, month: 1, day: null })).toBe('ene 2023')
    expect(formatPartialDate({ year: 2023, month: null, day: null })).toBe('2023')
  })
})

describe('describePeriod', () => {
  const date = (year: number) => ({ year, month: null, day: null })

  it('muestra el rango de años, o un solo año si empieza y termina el mismo', () => {
    expect(describePeriod({ startDate: date(2023), endDate: date(2024) }, 'FINISHED')).toBe('2023–2024')
    expect(describePeriod({ startDate: date(2024), endDate: date(2024) }, 'FINISHED')).toBe('2024')
  })

  it('indica «en emisión» solo si se está emitiendo y no hay fecha de fin', () => {
    expect(describePeriod({ startDate: date(2023), endDate: null }, 'RELEASING')).toBe('2023 – en emisión')
    expect(describePeriod({ startDate: date(2023), endDate: null }, 'FINISHED')).toBe('2023')
  })

  it('devuelve null sin año de estreno, sin inventar nada', () => {
    expect(describePeriod({ startDate: null, endDate: date(2024) }, 'FINISHED')).toBeNull()
  })
})

describe('describeAiringDates', () => {
  const day = { year: 2024, month: 7, day: 12 }

  it('da estreno y finalización cuando son distintos', () => {
    expect(describeAiringDates({ startDate: day, endDate: { year: 2024, month: 9, day: 27 } })).toEqual({
      start: '12 jul 2024',
      end: '27 sep 2024',
    })
  })

  it('omite la finalización si no existe o coincide con el estreno', () => {
    expect(describeAiringDates({ startDate: day, endDate: null })).toEqual({ start: '12 jul 2024', end: null })
    expect(describeAiringDates({ startDate: day, endDate: { ...day } })).toEqual({ start: '12 jul 2024', end: null })
  })

  it('no inventa fechas ausentes', () => {
    expect(describeAiringDates({ startDate: null, endDate: null })).toEqual({ start: null, end: null })
  })
})

describe('coverImageUrl', () => {
  it('añade el parámetro cors sin alterar el resto de la URL', () => {
    expect(coverImageUrl('https://s4.anilist.co/file/x/bx1-abc.jpg')).toBe('https://s4.anilist.co/file/x/bx1-abc.jpg?cors=1')
  })

  it('conserva los parámetros existentes y es idempotente', () => {
    expect(coverImageUrl('https://s4.anilist.co/a.jpg?v=2')).toBe('https://s4.anilist.co/a.jpg?v=2&cors=1')
    expect(coverImageUrl(coverImageUrl('https://s4.anilist.co/a.jpg'))).toBe('https://s4.anilist.co/a.jpg?cors=1')
  })
})

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
