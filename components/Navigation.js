import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { Button } from './ui/button';

const Navigation = () => {
  const pathname = usePathname();
  const { isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const [origin, setOrigin] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOrigin(window.location.origin);
  }, []);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Video Call', href: '/video-call' },
    { name: 'Profile', href: '/profile' },
  ];

  const handleLogout = () => {
    logout({ returnTo: origin });
  };

  // Avoid rendering logout/login buttons until client-side
  const authButtons = !mounted ? null : (
    <div className="flex items-center space-x-2">
      {isAuthenticated ? (
        <Button
          variant="outline"
          onClick={handleLogout}
        >
          Logout
        </Button>
      ) : (
        <Button onClick={() => loginWithRedirect()}>Login</Button>
      )}
    </div>
  );

  return (
    <nav className="bg-background border-b py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center space-x-1">
          <Link href="/" className="font-bold text-xl">
            Bit2Byte
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`text-sm ${
                pathname === item.href
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {authButtons}
      </div>
    </nav>
  );
};

export default Navigation;