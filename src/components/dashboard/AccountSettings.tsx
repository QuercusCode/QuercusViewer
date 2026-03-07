import { useAuth } from '../../lib/AuthContext';
import { User, Mail, Shield, Bell } from 'lucide-react';

export const AccountSettings = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your profile, preferences, and security.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 md:p-8 space-y-8">

                    {/* Profile Section */}
                    <section className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-500" />
                                Profile Information
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Update your account's profile information and email address.</p>
                        </div>

                        <div className="w-full md:w-2/3 space-y-4">
                            <div className="flex items-center gap-4">
                                <img
                                    className="h-16 w-16 rounded-full border border-gray-200 bg-gray-50 object-cover"
                                    src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=random`}
                                    alt="Profile"
                                />
                                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                                    Change Avatar
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    defaultValue={user?.user_metadata?.full_name || ''}
                                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <div className="flex rounded-md shadow-sm max-w-md">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                        <Mail className="h-4 w-4" />
                                    </span>
                                    <input
                                        type="email"
                                        disabled
                                        defaultValue={user?.email || ''}
                                        className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-none rounded-r-lg bg-gray-50 text-gray-500 sm:text-sm cursor-not-allowed"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">To change your email, please contact support.</p>
                            </div>

                            <div className="pt-2">
                                <button className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-200" />

                    {/* Security Section (Placeholder) */}
                    <section className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-green-500" />
                                Security
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Manage your password and security preferences.</p>
                        </div>

                        <div className="w-full md:w-2/3 space-y-4">
                            <button className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                Change Password
                            </button>
                        </div>
                    </section>

                    <hr className="border-gray-200" />

                    {/* Notifications Section (Placeholder) */}
                    <section className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3">
                            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-purple-500" />
                                Notifications
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Choose what updates you want to receive.</p>
                        </div>

                        <div className="w-full md:w-2/3 space-y-4">
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm text-gray-700">Email me when a new structure is shared with me</span>
                                <button className="bg-blue-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out">
                                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};
