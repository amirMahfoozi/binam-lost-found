import { PackageCheck, MapPin, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { AppUser } from '../App';
import { MapModal } from '../components/MapModal';

export default function Dashboard({
  user,
  onNavigate,
  onSignOut,
}: {
  user: AppUser;
  onNavigate: (p: string) => void;
  onSignOut: () => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <div>
      {user === null && <p>loading...</p>}

      {user !== null && (
        <>
          <div className='bg-white rounded-lg shadow-lg p-8'>
            <div className='text-center mb-8'>
              <div className='mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto'>
                <PackageCheck className='size-8 text-green-600' />
              </div>
              <h2 className='mb-2'>Welcome to Campus Lost &amp; Found!</h2>
              <p className='text-sm text-gray-600'>
                Signed in as {user.email} ({user.username})
              </p>
            </div>

            {/* Card 1: Items list */}
            <Link to='/items'>
              <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-4 cursor-pointer hover:bg-green-100 transition'>
                <div className='flex items-start gap-3'>
                  <PackageCheck className='size-5 text-green-600 mt-0.5' />
                  <div>
                    <h3 className='text-sm mb-1'>Lost/Found Items</h3>
                    <p className='text-xs text-gray-600'>See all of the lost and found items</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 2: Show map (opens modal) */}
            <div
              className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 cursor-pointer hover:bg-blue-100 transition'
              onClick={() => setMapOpen(true)}
              role='button'
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setMapOpen(true);
              }}
            >
              <div className='flex items-start gap-3'>
                <MapPin className='size-5 text-blue-600 mt-0.5' />
                <div>
                  <h3 className='text-sm mb-1'>Show Map</h3>
                  <p className='text-xs text-gray-600'>Browse items on the campus map and add new items by location</p>
                </div>
              </div>
            </div>

            {/* Sign out button */}
            <div className='flex justify-center'>
              <button
                type='button'
                onClick={onSignOut}
                className='inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700'
              >
                <LogOut className='size-4' />
                Sign Out
              </button>
            </div>
          </div>

          {/* Map Modal */}
          <MapModal open={mapOpen} onClose={() => setMapOpen(false)} />
        </>
      )}
    </div>
  );
}