import { FC, ReactNode } from 'react'
import Head from 'next/head'
import { Layout } from './Layout'

type DemoPageProps = {
  eyebrow: string
  title: string
  description?: ReactNode
  wide?: boolean
  children: ReactNode
}

export const DemoPage: FC<DemoPageProps> = ({
  eyebrow,
  title,
  description,
  wide,
  children
}) => (
  <Layout>
    <Head>
      <title>{`${title} · Relay Kit Demo`}</title>
    </Head>
    <div className={wide ? 'demo-page demo-page-wide' : 'demo-page'}>
      <div>
        <p className="demo-eyebrow">{eyebrow}</p>
        <h1 className="demo-title">{title}</h1>
        {description ? <p className="demo-subtitle">{description}</p> : null}
      </div>
      {children}
    </div>
  </Layout>
)

export const DemoOutput: FC<{ title: string; data: unknown }> = ({
  title,
  data
}) => (
  <section className="demo-panel">
    <h2>{title}</h2>
    <pre className="demo-output">{JSON.stringify(data, null, 2)}</pre>
  </section>
)
