import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../types';

interface UserManagementPageProps {
    users: User[];
    currentUser: User;
    onCreateUser: (user: Omit<User, 'id'>) => void;
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: number) => void;
}

const UserModal: React.FC<{
    user?: User | null;
    allUsers: User[];
    onSave: (user: User | Omit<User, 'id'>) => void;
    onCancel: () => void;
}> = ({ user, allUsers, onSave, onCancel }) => {
    const isEditMode = !!user;
    const [username, setUsername] = useState(user?.username || '');
    const [role, setRole] = useState(user?.role || UserRole.TECHNICIAN);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedUsername = username.trim();
        
        if (!trimmedUsername) {
            setError('Username cannot be empty.');
            return;
        }

        const isDuplicate = allUsers.some(
            u => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.id !== user?.id
        );

        if (isDuplicate) {
            setError('This username is already taken.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (!isEditMode && !password) {
            setError('Password is required for new users.');
            return;
        }

        const userPayload: any = {
            username: trimmedUsername,
            role,
        };

        if (password) {
            userPayload.password = password;
        }
        
        if (isEditMode) {
            onSave({ ...user, ...userPayload });
        } else {
            onSave(userPayload);
        }
    };
    
    const passwordPlaceholder = isEditMode ? "Leave blank to keep current password" : "Enter password";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-white">{isEditMode ? 'Edit User' : 'Add New User'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={e => { setUsername(e.target.value); setError(''); }}
                            className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:border-cyan-500 transition ${error.includes('username') ? 'border-red-500 ring-red-500/50' : 'border-gray-600 focus:ring-cyan-500'}`}
                            required
                            autoFocus
                        />
                        {error.includes('username') && <p className="mt-2 text-sm text-red-400">{error}</p>}
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                        <select
                            id="role"
                            value={role}
                            onChange={e => setRole(e.target.value as UserRole)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                        >
                            <option value={UserRole.TECHNICIAN}>Technician</option>
                            <option value={UserRole.MANAGER}>Manager</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            placeholder={passwordPlaceholder}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:border-cyan-500 transition ${error.includes('password') || error.includes('match') ? 'border-red-500 ring-red-500/50' : 'border-gray-600 focus:ring-cyan-500'}`}
                        />
                    </div>
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            placeholder={passwordPlaceholder}
                            onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                            className={`w-full bg-gray-700 border text-white rounded-lg px-3 py-2 focus:ring-2 focus:border-cyan-500 transition ${error.includes('match') ? 'border-red-500 ring-red-500/50' : 'border-gray-600 focus:ring-cyan-500'}`}
                        />
                         {error && !error.includes('username') && <p className="mt-2 text-sm text-red-400">{error}</p>}
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const DeleteConfirmationModal: React.FC<{ user: User; onConfirm: () => void; onCancel: () => void; }> = ({ user, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">Confirm Deletion</h2>
            <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to delete the user <span className="font-bold text-cyan-400">{user.username}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
                <button onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Delete</button>
            </div>
        </div>
    </div>
);


export const UserManagementPage: React.FC<UserManagementPageProps> = ({ users, currentUser, onCreateUser, onUpdateUser, onDeleteUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);
    
    const canManage = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;
    if (!canManage) {
        return (
            <div className="p-8 h-full flex items-center justify-center text-center">
                <div>
                    <h1 className="text-2xl font-bold text-red-400">Access Denied</h1>
                    <p className="text-gray-400 mt-2">You do not have permission to manage users.</p>
                </div>
            </div>
        );
    }

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleSaveUser = (user: User | Omit<User, 'id'>) => {
        if ('id' in user) {
            onUpdateUser(user as User);
        } else {
            onCreateUser(user as Omit<User, 'id'>);
        }
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDelete = (user: User) => {
        setDeletingUser(user);
    };
    
    const confirmDelete = () => {
        if (deletingUser) {
            onDeleteUser(deletingUser.id);
            setDeletingUser(null);
        }
    };
    
    const UserRoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
        const styles = {
            [UserRole.ADMIN]: 'bg-purple-500/20 text-purple-300',
            [UserRole.MANAGER]: 'bg-yellow-500/20 text-yellow-300',
            [UserRole.TECHNICIAN]: 'bg-blue-500/20 text-blue-300',
        };
        return <span className={`px-3 py-1 text-xs font-semibold rounded-full ${styles[role]}`}>{role}</span>;
    };
    
    return (
        <div className="p-8 h-full overflow-y-auto">
            {isModalOpen && (
                <UserModal
                    user={editingUser}
                    allUsers={users}
                    onSave={handleSaveUser}
                    onCancel={() => setIsModalOpen(false)}
                />
            )}
            {deletingUser && (
                <DeleteConfirmationModal
                    user={deletingUser}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeletingUser(null)}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">User Management</h1>
                <button
                    onClick={handleAddNew}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 11a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1v-1z" />
                    </svg>
                    Add New User
                </button>
            </div>
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                />
            </div>

            <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
                <table className="min-w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-700/50 text-xs text-gray-400 uppercase tracking-wider">
                        <tr>
                            <th scope="col" className="px-6 py-3">Username</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredUsers.map(user => {
                            const isSelf = currentUser.id === user.id;
                            const canEdit = !isSelf && (currentUser.role === UserRole.ADMIN || (currentUser.role === UserRole.MANAGER && user.role !== UserRole.ADMIN));
                            const canDelete = canEdit; // Same logic applies

                            return (
                                <tr key={user.id} className="hover:bg-gray-700/50 transition-colors duration-200 group">
                                    <td className="px-6 py-4 font-medium text-white">{user.username}</td>
                                    <td className="px-6 py-4"><UserRoleBadge role={user.role} /></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {isSelf && <span className="text-xs text-gray-500 italic">This is you</span>}
                                            <button onClick={() => handleEdit(user)} disabled={!canEdit} className="text-blue-400 hover:text-blue-300 p-1 disabled:text-gray-600 disabled:cursor-not-allowed" title="Edit User">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(user)} disabled={!canDelete} className="text-red-400 hover:text-red-300 p-1 disabled:text-gray-600 disabled:cursor-not-allowed" title="Delete User">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};