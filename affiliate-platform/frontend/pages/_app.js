/**
 * pages/_app.js — App shell: global styles, layout, toast notifications
 */

import { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  // Pages can opt out of the default layout via getLayout
  const getLayout = Component.getLayout ?? ((page) => <Layout>{page}</Layout>);

  return (
    <>
      {getLayout(<Component {...pageProps} />)}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
    </>
  );
}
