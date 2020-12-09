// temp api until endpoints in openAPI spec
// TODO update openAPI spec and update `addons` commands
//
const fetch = require('node-fetch')

const createAddon = async (settings, netlifyApiToken) => {
  const { siteId, addon, config } = settings
  const url = `https://api.netlify.com/api/v1/sites/${siteId}/services/${addon}/instances`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${netlifyApiToken}`,
    },
    body: JSON.stringify({
      config,
    }),
  })

  const data = await response.json()

  if (response.status === 422) {
    throw new Error(data.error)
  }

  return data
}

const getAddons = async (siteId, netlifyApiToken) => {
  const url = `https://api.netlify.com/api/v1/sites/${siteId}/service-instances`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${netlifyApiToken}`,
    },
  })

  const data = await response.json()

  if (response.status === 422) {
    throw new Error(data.error)
  }

  return data
}

const deleteAddon = async (settings, netlifyApiToken) => {
  const { siteId, addon, instanceId } = settings
  const url = `https://api.netlify.com/api/v1/sites/${siteId}/services/${addon}/instances/${instanceId}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${netlifyApiToken}`,
    },
  })

  if (response.status === 422) {
    const data = await response.json()
    throw new Error(data.error)
  }

  return response
}

const updateAddon = async (settings, netlifyApiToken) => {
  const { siteId, addon, config, instanceId } = settings
  const url = `https://api.netlify.com/api/v1/sites/${siteId}/services/${addon}/instances/${instanceId}`

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${netlifyApiToken}`,
    },
    body: JSON.stringify({
      config,
    }),
  })

  if (response.status === 422) {
    const data = await response.json()
    throw new Error(data.error)
  }

  return response
}

module.exports = {
  getAddons,
  createAddon,
  updateAddon,
  deleteAddon,
}
