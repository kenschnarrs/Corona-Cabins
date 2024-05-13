import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signOut, useSession } from 'next-auth/react';
import {
  Navbar, 
  NavbarContent, 
} from "@nextui-org/navbar";
import { Button } from '@nextui-org/react';

const CustomHeader: React.FC = () => {
  const router = useRouter();
  const isActive: (pathname: string) => boolean = (pathname) =>
    router.pathname === pathname;

  const { data: session, status } = useSession();

  return (
    <Navbar isBordered>
      <NavbarContent>
        <Link href="/">
          Cabañas Corona
        </Link>
        {
          session && (
            <Link href="/inquiries">
              Inquiries
            </Link>
          )
        }
      </NavbarContent>
      <NavbarContent justify="end">
        {status === 'loading' ? (
          <p>Validating session ...</p>
        ) : session ? (
          <>
            <p>{session.user.name} ({session.user.email})</p>
            <Button onClick={() => signOut()}>Log out</Button>
          </>
        ) : (
          <Link href="/api/auth/signin">
            Log in
          </Link>
        )}
      </NavbarContent>
    </Navbar>
  );
};

export default CustomHeader;
