import { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "../lib/i18n";

import "../globals.css";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <SessionProvider session={pageProps.session}>
      <LanguageProvider>
        <Component {...pageProps} />
      </LanguageProvider>
    </SessionProvider>
  );
};

export default App;
