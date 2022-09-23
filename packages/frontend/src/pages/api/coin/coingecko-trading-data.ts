import { CoingeckoTradingData } from '@models/Coin.model'
import { graphCmsClient } from '@shared/graphCmsClient'
import axios from 'axios'
import dayjs from 'dayjs'
import { gql } from 'graphql-request'
import { NextApiRequest, NextApiResponse } from 'next'

/**
 * Fetch price history from CoinGecko & cache in GraphCMS
 */
export const CG_TRADING_DATA_MAX_AGE_MINUTES = 60 * 6
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const symbol = req.body?.symbol as string
  const coingeckoId = req.body?.coingeckoId as string
  if (!symbol || !coingeckoId) return res.status(401).end()

  try {
    // Fetch cached price history from GraphCMS
    const query = gql`
      query Coin($symbol: String!) {
        coin(where: { symbol: $symbol }) {
          cgTradingData
        }
      }
    `
    const graphCmsData = await graphCmsClient.request(query, { symbol })
    const cachedCgTradingData: CoingeckoTradingData = graphCmsData?.coin?.cgTradingData || {}
    const updatedAt = cachedCgTradingData?.updatedAt
    const isOutdated = dayjs().diff(updatedAt, 'minute', true) > CG_TRADING_DATA_MAX_AGE_MINUTES
    if (updatedAt && !isOutdated) {
      return res.status(200).end()
    }

    // Fetch price history from CoinGecko
    const params = new URLSearchParams({
      vs_currency: 'USD',
      days: '90',
      interval: 'daily',
    }).toString()
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?${params}`
    const { data: cgData } = await axios.get<CoingeckoTradingData>(url)
    const cgTradingData = {
      ...cgData,
      updatedAt: dayjs().toISOString(),
    }

    // Update in GraphCMS (async)
    const mutation = gql`
      mutation UpdateAndPublishCoin($symbol: String!, $cgTradingData: Json!) {
        updateCoin(where: { symbol: $symbol }, data: { cgTradingData: $cgTradingData }) {
          id
        }
        publishCoin(where: { symbol: $symbol }, to: PUBLISHED) {
          id
        }
      }
    `
    graphCmsClient.request(mutation, { symbol, cgTradingData })

    res.status(200).end()
  } catch (e) {
    console.error('Error while fetching data from CoinGecko', e)
    res.status(500).end()
  }
}