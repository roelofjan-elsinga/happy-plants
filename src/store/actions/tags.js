import uuid from 'uuid/v4'

import {
  getEntry as getEntryLF,
  addEntry as addEntryLF,
  updateEntry as updateEntryLF
} from '@/api/localforage'

import {
  getEntry as getEntryFire,
  updateEntry as updateEntryFire
} from '@/api/firebase'

const namespace = 'tags'

export async function loadTags ({ state, commit }, data = {}) {
  let tags = []

  if (state.storage.type === 'cloud') {
    const data = await getEntryFire([['users', state.user.id]])
    if (data.exists) {
      tags = data.data()[namespace]
    }
  } else {
    tags = await getEntryLF(namespace)
  }

  return commit('LOAD_TAGS', { tags })
}

export async function addTag ({ state, commit }, data) {
  const meta = {
    ...data,
    guid: uuid(),
    created: Date.now(),
    modified: Date.now()
  }
  const updated = Date.now()
  await updateEntryLF('updated', updated)

  commit('ADD_TAG', { item: meta, updated })

  if (state.storage.type === 'cloud') {
    await updateEntryFire([['users', state.user.id]], { tags: state.tags })
  }

  await addEntryLF(namespace, state.tags)
}

export async function deleteTag ({ state, commit }, data) {
  const updated = Date.now()
  await updateEntryLF('updated', updated)

  commit('DELETE_TAG', { item: data, updated })

  if (state.storage.type === 'cloud') {
    await updateEntryFire([['users', state.user.id]], { tags: state.tags })
  }

  await addEntryLF(namespace, state.tags)
}

export async function updateTag ({ state, commit }, data) {
  const item = state.tags.find(tag => tag.guid === data.guid)
  const meta = { ...item, ...data, modified: Date.now() }
  const updated = Date.now()
  await updateEntryLF('updated', updated)

  commit('UPDATE_TAG', { item: meta })

  if (state.storage.type === 'cloud') {
    await updateEntryFire([['users', state.user.id]], { tags: state.tags })
  }

  await addEntryLF(namespace, state.tags)
}
