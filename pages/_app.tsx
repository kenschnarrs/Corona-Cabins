
import { AppProps } from "next/app";
import { SessionProvider } from 'next-auth/react';
import {NextUIProvider} from '@nextui-org/react'

import '../globals.css'


const App = ({ Component, pageProps }: AppProps) => {
  return (
    <NextUIProvider>
      <SessionProvider session={pageProps.session}>
        <Component {...pageProps} />
      </SessionProvider>
    </NextUIProvider>
  );
};

export default App;
