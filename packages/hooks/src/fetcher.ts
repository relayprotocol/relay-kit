import axios, { type AxiosRequestConfig } from 'axios'

const fetcher = async (url: string, headers?: HeadersInit) => {
  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Network error')
  }

  return response.json()
}

export default fetcher

export async function axiosPostFetcher(
  url: string,
  params: any,
  config?: AxiosRequestConfig
) {
  const { data } = await axios.post(url, params, config)
  return data
}
