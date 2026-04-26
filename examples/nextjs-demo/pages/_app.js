import dynamic from 'next/dynamic';

const Layout = dynamic(() => import('../components/layout'), { ssr: false });

export default function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
