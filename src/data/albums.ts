import type { Album } from '../types/album'

const placeholder = `${import.meta.env.BASE_URL}transmute-mark.svg`

export const createDemoAlbums = (): Album[] => [
  { id: 1, title: 'Midnight Signals', artist: 'The Northern Lights', price: 12.99, image_url: placeholder },
  { id: 2, title: 'City in Motion', artist: 'Paper Satellites', price: 10.99, image_url: placeholder },
  { id: 3, title: 'Quiet Horizons', artist: 'Mira & the Echoes', price: 14.49, image_url: placeholder },
  { id: 4, title: 'Electric Gardens', artist: 'Velvet Circuit', price: 11.99, image_url: placeholder },
  { id: 5, title: 'Sunday Sketches', artist: 'The Amber Trio', price: 9.99, image_url: placeholder },
  { id: 6, title: 'Open Roads', artist: 'Westbound Stories', price: 13.99, image_url: placeholder }
]
