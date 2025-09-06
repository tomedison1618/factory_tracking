import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';

interface HeaderProps {
    currentPath: string;
    currentUser: User;
    onLogout: () => void;
    onSearchForTraveler: (serialNumber: string) => void;
}

const NavLink: React.FC<{ href: string; currentPath: string; children: React.ReactNode }> = ({ href, currentPath, children }) => {
    const linkPath = href.substring(1); // e.g., #/jobs -> /jobs
    const isActive = linkPath === '/' 
        ? currentPath === '/' 
        : currentPath.startsWith(linkPath);

    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer";
    const activeClasses = "bg-gray-700 text-white";
    const inactiveClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.location.hash = href;
    };

    return (
        <a href={href} onClick={handleClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {children}
        </a>
    );
};

const DropdownLink: React.FC<{ href: string; onClick: () => void; children: React.ReactNode }> = ({ href, onClick, children }) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.location.hash = href;
        onClick(); // Close dropdown on click
    };
    return (
        <a href={href} onClick={handleClick} className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 w-full text-left">
            {children}
        </a>
    );
};

const NavDropdown: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 cursor-pointer flex items-center";
    const inactiveClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className={`${baseClasses} ${inactiveClasses}`}>
                {title}
                <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            {isOpen && (
                <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                        {React.Children.map(children, child =>
                            React.isValidElement(child) ? React.cloneElement(child, { onClick: () => setIsOpen(false) } as any) : child
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const TravelerSearch: React.FC<{ onSearch: (serialNumber: string) => void }> = ({ onSearch }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            onSearch(searchTerm.trim());
            setSearchTerm('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Product Traveler..."
                className="bg-gray-700 border border-gray-600 text-white rounded-md pl-3 pr-10 py-1 text-sm focus:ring-2 focus:ring-cyan-500 transition w-48"
            />
            <button type="submit" className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors" title="Search Traveler">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
            </button>
        </form>
    );
};

const UserDisplay: React.FC<{ currentUser: User, onLogout: () => void }> = ({ currentUser, onLogout }) => {
    return (
        <div className="flex items-center space-x-3">
            <div className="text-right">
                <p className="text-sm font-medium text-white">{currentUser.username}</p>
                <p className="text-xs text-gray-400">{currentUser.role}</p>
            </div>
            <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
            </button>
        </div>
    )
}

export const Header: React.FC<HeaderProps> = ({ currentPath, currentUser, onLogout, onSearchForTraveler }) => {
  return (
    <header className="flex justify-between items-center p-4 border-b border-gray-700 shadow-md bg-gray-800/80 backdrop-blur-sm sticky top-0 z-40">
      <a 
        href="#/" 
        onClick={(e) => { e.preventDefault(); window.location.hash = '#/'; }}
        className="flex items-center cursor-pointer"
      >
        <svg className="w-8 h-8 text-cyan-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.871A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h4.5M12 3v8.25m0 0l-3-3m3 3l3-3" />
        </svg>
        <h1 className="text-2xl font-bold text-gray-100">Factory Production Tracker</h1>
      </a>
      <div className="flex items-center space-x-6">
        <nav className="flex items-center space-x-4">
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                <a 
                    href="#/jobs/new" 
                    onClick={(e) => { e.preventDefault(); window.location.hash = '#/jobs/new'; }}
                    className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium px-3 py-2 rounded-md shadow-sm transition-colors duration-300"
                    title="Create a New Job"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Job
                </a>
            )}
            <NavLink href="#/jobs" currentPath={currentPath}>Jobs</NavLink>
             <NavDropdown title="Kanban Views">
                <DropdownLink href="#/kanban/jobs" onClick={() => {}}>Job-Centric</DropdownLink>
                <DropdownLink href="#/kanban/personnel" onClick={() => {}}>Personnel-Centric</DropdownLink>
            </NavDropdown>
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                <NavDropdown title="Management">
                    <DropdownLink href="#/product-types" onClick={() => {}}>Product Types</DropdownLink>
                    <DropdownLink href="#/users" onClick={() => {}}>User Management</DropdownLink>
                </NavDropdown>
            )}
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                <NavLink href="#/reports" currentPath={currentPath}>Reports</NavLink>
            )}
            {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                <NavLink href="#/ai-assistant" currentPath={currentPath}>
                    <div className="flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.618 2.065A.5.5 0 0110 2.5v1.259a.5.5 0 01-.152.353L8 6.017V7.5a.5.5 0 01-1 0V6.017L5.152 4.112A.5.5 0 015 3.759V2.5a.5.5 0 01.382-.485l.02-.006a10.82 10.82 0 014.236-.002l.02-.006zM2.848 7.152A.5.5 0 013.259 7h1.259a.5.5 0 01.353.152L6.772 9H7.5a.5.5 0 010 1H6.772l-1.904 1.848A.5.5 0 014.517 12H3.259a.5.5 0 01-.41-.74l.006-.01A10.82 10.82 0 012.848 7.152zM15.152 7.152a.5.5 0 00-.41.74l.006.01a10.82 10.82 0 00.002 4.236l-.006.01a.5.5 0 00.41.74h1.259a.5.5 0 00.353-.152L18 10.096V11.5a.5.5 0 001 0v-1.404l1.848-1.904A.5.5 0 0020 7.848v-1.26a.5.5 0 00-.382-.485l-.02-.006a10.82 10.82 0 00-4.236-.002l-.02-.006A.5.5 0 0015.152 6h-1.404L12 7.848A.5.5 0 0012.152 8.2l1.904 1.904L15.483 10H14.5a.5.5 0 000 1h.983l1.904-1.848A.5.5 0 0017.848 8H16.596L15.152 7.152zM10 12.5a.5.5 0 01.382.485l.02.006a10.82 10.82 0 004.236.002l.02.006A.5.5 0 0115 13.5v1.259a.5.5 0 01-.152.353L13 17.017V18.5a.5.5 0 01-1 0v-1.483l-1.848-1.904A.5.5 0 019.848 15H8.596L7.152 13.152A.5.5 0 017 12.793v-1.26a.5.5 0 01.382-.485l.02-.006a10.82 10.82 0 014.236-.002l.02-.006A.5.5 0 0112.152 11H13.5a.5.5 0 010 1h-.983l-1.904 1.848A.5.5 0 0010.152 14H11.4l1.447 1.447A.5.5 0 0013.207 15H14.5a.5.5 0 010-1h-.983L11.669 12H10v.5z" clipRule="evenodd" />
                        </svg>
                        AI Assistant
                    </div>
                </NavLink>
            )}
        </nav>
        <div className="flex items-center space-x-6 border-l border-gray-600 pl-6">
            <TravelerSearch onSearch={onSearchForTraveler} />
            <UserDisplay currentUser={currentUser} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
};