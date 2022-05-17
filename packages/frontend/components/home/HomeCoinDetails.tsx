import { RichText } from '@graphcms/rich-text-react-renderer'
import { Coin, CryptopanicNews } from '@models/Coin.model'
import axios from 'axios'
import dayjs from 'dayjs'
import Link from 'next/link'
import { FC } from 'react'
import { useQuery } from 'react-query'
import 'twin.macro'
import { BloombergBox } from './BloombergBox'

export interface HomeCoinDetailsProps {
  coin: Coin
}
export const HomeCoinDetails: FC<HomeCoinDetailsProps> = ({coin}) => {
  return <>
    <div tw="flex flex-col overflow-hidden space-y-1">
      <HomeCoinDetailsMain coin={coin} />
      <HomeCoinDetailsNewsticker coin={coin} />
    </div>
  </>
}

export const HomeCoinDetailsMain: FC<HomeCoinDetailsProps> = ({coin}) => {
  return <>
    <BloombergBox tw="flex-1" title={coin.name}>
      {coin.description &&
        <div tw="prose prose-invert">
          <RichText content={coin.description} />
        </div>
      }
      <pre tw="text-xs leading-[1.3] text-bbg-gray1 max-w-full overflow-scroll">
        {JSON.stringify(coin, null, 2)}
      </pre>
    </BloombergBox>
  </>
}

export const HomeCoinDetailsNewsticker: FC<HomeCoinDetailsProps> = ({coin}) => {
  const query = () => axios.post<{ news: CryptopanicNews[] }>(
    '/api/news',
    { symbol: coin.symbol, limit: 5 }
  )
  const { data, isLoading, isError } = useQuery(['news', coin.id], query, { retry: false })

  if (isError) return null
  return <>
    <BloombergBox title='Newsticker'>
      <div tw="flex flex-col -mx-2 -mb-2">
        {isLoading ? (
          <div tw="px-2 pb-2 text-sm text-bbg-gray1 animate-pulse">
            Loading...
          </div>
        ) : (
          (data?.data?.news || []).map(n => (
            <Link key={n.id} href={n.url} target='_blank' passHref>
              <a tw="flex justify-between px-1 bg-black cursor-pointer hover:bg-bbg-gray3 text-sm">  
                <div tw="truncate pb-0.5 px-1 text-bbg-orange">
                  {n.title}
                </div>
                <div tw="whitespace-nowrap pb-0.5 px-1 text-bbg-gray1">
                  {dayjs(n.published_at).format('YYYY/MM/DD hh:mm')}
                </div>
              </a>
            </Link>
          ))
        )}
      </div>
    </BloombergBox>
  </>
}