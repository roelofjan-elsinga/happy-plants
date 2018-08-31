import uuid from 'uuid/v4'
import { blobToBase64String } from 'blob-util'
// import { convertToBlob } from '@/utils/blob'
import { iOS } from '@/utils/useragent'

import {
  getEntry as getEntryLF,
  addEntry as addEntryLF,
  updateEntry as updateEntryLF,
  deleteEntry as deleteEntryLF
} from '@/api/localforage'

import {
  storagePath,
  firestoreQuery,
  addEntry as addEntryFire,
  updateEntry as updateEntryFire,
  deleteEntry as deleteEntryFire,
  uploadFile,
  deleteFile,
  downloadFile
} from '@/api/firebase'

const namespace = 'plant-'
const folder = 'plants'
const fileName = 'cover.png'

export async function loadPlants ({ state, commit }, data = {}) {
  let plants = []
  commit('LOAD_PLANTS_PROGRESS')

  if (state.storage.type === 'cloud' && state.user.id) {
    const snapshot = await firestoreQuery([['users', state.user.id], [folder]]).get()
    for (const doc of snapshot.docs) {
      const plant = await firestoreQuery([
        ['users', state.user.id],
        [folder, doc.id]
      ]).get()
      const data = plant.data()
      plants.push({
        ...data,
        imageURL: data.imageURL && await downloadFile(data.imageURL)
      })
    }
  } else {
    const values = await getEntryLF(namespace)
      .then(data => {
        const copy = data
        delete copy[namespace + 'undefined']
        return copy
      })
      .then(Object.values)
    for (const item of values) {
      plants.push((item))
    }
  }

  return commit('LOAD_PLANTS_SUCCESS', { plants })
}

export function loadPlantItem ({ state, commit }, guid) {
    commit('LOAD_PLANT_ITEM', { guid })
}

export async function addPlant ({ state, commit }, data) {
  const meta = {
    ...data,
    guid: uuid(),
    created: Date.now(),
    modified: Date.now()
  }
  const payload = { item: meta }

  if (state.storage.type === 'cloud') {
    const path = [['users', state.user.id], [folder, meta.guid]]
    await addEntryFire(path, {
      ...meta,
      blob: null,
      imageURL: `${storagePath(path)}/${fileName}`
    })
    await uploadFile(path.concat(fileName), meta.blob)
  } else {
    // FIXME: This is generally a bad idea. Use feature detection instead.
    // However, I could not find a reliable way to test if IndexedDB supports blobs,
    // as it fails silently. We have to convert the blob to base64,
    // because mobile Safari 10 has a bug with storing Blobs in IndexedDB.
    if (iOS && !!data.blob) {
      // 1. Turn blob into base64 string (only needed for storage)
      const base64String = await blobToBase64String(data.blob)
      const config = Object.assign({}, meta, { blob: base64String })

      await addEntryLF(namespace + config.guid, config)
      payload.item = Object.assign({}, config, { blob: data.blob })
    } else {
      await addEntryLF(namespace + meta.guid, meta)
    }
  }

  commit('ADD_PLANT', payload)
  return meta.guid
}

export async function updatePlant (action, { state, commit }, data) {
  const updated = Date.now()
  await updateEntryLF('updated', updated)

  commit(action, { item: data, updated })

  if (state.storage.type === 'cloud') {
    const path = [['users', state.user.id], [folder, state.selected.guid]]
    const { imageURL, blob, ...selected } = state.selected

    if (action === 'UPDATE_PHOTO') {
      await uploadFile(path.concat(fileName), data.blob)
    }

    await updateEntryFire(path, selected)
  } else {
    await updateEntryLF(namespace + state.selected.guid, state.selected)
  }
}

export async function deletePlants ({ state, commit }, items) {
  if (state.storage.type === 'cloud') {
    await Promise.all(items.map(async item => {
      const path = [['users', state.user.id], [folder, item.guid]]
      await deleteEntryFire(path)
      await deleteFile(path.concat(fileName))
    }))
  } else {
    await Promise.all(items.map(item => deleteEntryLF(namespace + item.guid, item)))
  }

  commit('DELETE_PLANTS', { items })
}
