import { PackageCheck, FileText, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { AppUser } from "../App";

export default function Dashboard({ user, onNavigate, onSignOut }: { user: AppUser; onNavigate: (p: string) => void; onSignOut: () => void }) {
    return (
      <div>
      {user===null && <p>loading...</p>}

      {user!==null && 
        <div className="bg-white rounded-lg shadow-lg p-8">
        
        <div className="text-center mb-8">
          <div className="mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <PackageCheck className="size-8 text-green-600" />
          </div>
          <h2 className="mb-2">Welcome to Campus Lost &amp; Found!</h2>
          <p className="text-sm text-gray-600">Signed in as {user.email} ({user.username})</p>
        </div>
  
        <Link to="/items">
        {/* <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 cursor-pointer" onClick={() => onNavigate("/items")}> */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 cursor-pointer">
          <div className="flex items-start gap-3">
            <PackageCheck className="size-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="text-sm mb-1">Lost/Found Items</h3>
              <p className="text-xs text-gray-600">See all of the lost and found items</p>
            </div>
          </div>
        </div>
        </Link>
  
        <Link to="/add-item">
        <div className="space-y-4 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer" onClick={() => onNavigate("/add-item")}>
            <div className="flex items-start gap-3">
              <FileText className="size-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm mb-1">Report Lost Items</h3>
                <p className="text-xs text-gray-600">Let others know what you've lost so they can help you find it</p>
              </div>
            </div>
          </div>
        </div>
        </Link>
  
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Bell className="size-5 text-purple-600 mt-0.5" />
            <div>
              <h3 className="text-sm mb-1">Get Notifications</h3>
              <p className="text-xs text-gray-600">Receive alerts when items matching your description are found</p>
            </div>
          </div>
        </div>
  
        <div className="text-center">
          <button onClick={onSignOut} className="text-blue-600 hover:underline text-sm">Sign Out</button>
        </div>
      </div>
    }
    </div>
    );
}
