"use client"

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Home, Truck, Fuel, Calendar, Users, Settings, Menu, ChevronDown, Bell, User, LogOut, BarChart, UserCircle, Settings as SettingsIcon, HelpCircle, CalendarCheck, Settings2Icon, LucideGauge, LucideTimerReset, PlusIcon, CircleDotIcon, DatabaseIcon, Disc2, LogOutIcon, PackagePlus, BoxesIcon, LucideDatabaseBackup, CarIcon } from 'lucide-react';
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format, parseISO, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FaDotCircle } from "react-icons/fa";
import { GiFlatTire } from "react-icons/gi";
import { PiTireFill } from "react-icons/pi";


interface LayoutProps {
  children: React.ReactNode;
}

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

interface Task {
  id: number;
  vehicleid: number;
  date: string;
  description: string;
  tag: string;
  status: string;
  completed: boolean
}

interface Vehicle {
  id: number;
  plate: string;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    vehicles: false,
    fuel: false
  });
  const [activePage, setActivePage] = useState('Ana Sayfa');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuCollapsed(!isMenuCollapsed);

  const toggleSubmenu = (menu: 'vehicles' | 'fuel') => {
    setExpandedMenus(prev => {
      const newState = { vehicles: false, fuel: false };
      newState[menu] = !prev[menu];
      return newState;
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setIsAuthenticated(false);
      setUser(null);
      navigate('/login');
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!profileError && profileData) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            username: profileData.username,
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            avatarUrl: profileData.avatar_url
          });
        }
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('date', { ascending: true });
      if (!error && data) {
        setTasks(data);
      }
    };

    const fetchVehicles = async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate');
      if (!error && data) {
        setVehicles(data);
      }
    };

    if (isAuthenticated) {
      fetchTasks();
      fetchVehicles();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const currentPath = location.pathname;
    const currentPage = menuItems.find(item => {
      if (item.path === currentPath) return true;
      if (item.subItems) {
        return item.subItems.some(subItem => subItem.path === currentPath);
      }
      return false;
    });
    if (currentPage) {
      setActivePage(currentPage.name);
    }
  }, [location]);

  const menuItems = [
    { name: 'Ana Sayfa', icon: Home, path: '/' },
    {
      name: 'Araçlarım',
      icon: Truck,
      subItems: [
        { name: 'Araçlarım', icon: Truck, path: '/vehicles' },
        { name: 'Servis / Bakım', icon: Settings2Icon, path: '/service' },
        { name: 'Vize/Muayene', icon: CalendarCheck, path: '/visa' },
        { name: 'Km Kayıtları', icon: LucideGauge, path: '/km-records' },
        { name: 'Yeni Araç Tanımla', icon: PlusIcon, path: '/vehicles/add' },
      ]
    },
    {
      name: 'Akaryakıt',
      icon: Fuel,
      subItems: [
        { name: 'Yakıt Depo/Stoklarım', icon: BoxesIcon, path: '/fuel-tanks' },
        { name: 'Akaryakıt Kayıtları', icon: Fuel, path: '/fuel-records' },
        { name: 'Sayaçsız Yakıt Çıkışları', icon: LogOutIcon, path: '/fuel-exits' },
        { name: 'Yakıt Stok/Depo Tanımlama', icon: PackagePlus, path: '/fuel-tank-definition' },
        { name: 'Depo Yakıt Girişi', icon: LucideDatabaseBackup, path: '/fuel-tank-entry' },
        { name: 'Araç Yakıt Girişi', icon: CarIcon, path: '/vehicle-fuel-entry' },
      ]
    },
    {
      name: 'Lastik',
      icon: FaDotCircle,
      subItems: [
        { name: 'Lastik Envanteri', icon: BoxesIcon, path: '/tire-stok' },
        { name: 'Lastik Kayıtları', icon: PiTireFill , path: '/tire-records' },
        { name: 'Lastik Stok Giriş', icon: LogOutIcon, path: '/add-new-tire' },
        { name: 'Lastik Değişim', icon: GiFlatTire , path: '/tire-change' },
      ]
    },

    { name: 'Görevler', icon: Calendar, path: '/tasks' },
    { name: 'Raporlar', icon: BarChart, path: '/reports' },
  ];

  const formatTaskDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'dd.MM.yyyy');
  };

  const getTaskTagName = (tag: string) => {
    const tagMap: { [key: string]: string } = {
      'vize': 'Vize/Muayene',
      'servis': 'Servis/Bakım',
      'sigorta': 'Sigorta Yenileme',
      'egzoz': 'Egzoz Emisyon Ölçümü',
      'lastik': 'Lastik Değişimi'
    };
    return tagMap[tag] || tag;
  };

  const notifications = tasks.filter(task => {
    const taskDate = parseISO(task.date)
    const today = new Date()
    const daysUntilTask = differenceInDays(taskDate, today)
    return daysUntilTask >= 0 && daysUntilTask <= 30 && !task.completed
  }).map(task => {
    const vehicle = vehicles.find(v => v.id === task.vehicleid);
    return {
      ...task,
      vehiclePlate: vehicle ? vehicle.plate : 'Bilinmeyen Araç'
    };
  });

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-[#1E1F24] text-gray-300 transition-all duration-300 flex flex-col ${isMenuCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center justify-center h-16 bg-[#1E1F24]">
          <div className="flex items-center">
            <img
              src="/ICE-FAVICON.png"
              alt="Araç Yönetim Sistemi"
              className="logo"
              style={{ maxWidth: '50px', height: 'auto', marginTop: '8px' , marginLeft: '1px'}}
            />
            {!isMenuCollapsed && (
              <div className="ml-3">
                <img
                  src="/ICE-TEXT.png"
                  alt="Araç Yönetim Sistemi"
                  className="logo"
                  style={{ maxWidth: '100px', height: 'auto', marginTop: '10px' }}
                />
              </div>
            )}
          </div>
        </div>
        <nav className="flex-grow mt-5">
          {menuItems.map((item) => (
            <div key={item.name}>
              {isMenuCollapsed && item.subItems ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative w-full justify-center px-2 mb-1 h-10 hover:bg-white hover:text-gray-800"
                    >
                      <item.icon className="h-5 w-5" />
                      <ChevronDown className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="right"
                    className="min-w-48 bg-[#1E1F24] text-gray-300"
                    align="start"
                    alignOffset={-4}
                  >
                    <DropdownMenuGroup>
                      {item.subItems.map((subItem) => (
                        <DropdownMenuItem
                          key={subItem.path}
                          className="hover:bg-gray-800"
                          onClick={() => {
                            navigate(subItem.path);
                            setActivePage(subItem.name);
                          }}
                        >
                          <subItem.icon className="mr-2 h-4 w-4" />
                          {subItem.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  className={`w-full justify-start mb-1 ${isMenuCollapsed ? 'px-2' : 'px-4'} ${
                    location.pathname === item.path ? 'bg-gray-800 text-white' : ''
                  }`}
                  onClick={() => {
                    if (item.subItems) {
                      toggleSubmenu(item.name.toLowerCase() as 'vehicles' | 'fuel');
                    } else {
                      navigate(item.path);
                      setActivePage(item.name);
                    }
                  }}
                >
                  <item.icon className={`${isMenuCollapsed ? 'mx-auto' : 'mr-2'} h-5 w-5`} />
                  {!isMenuCollapsed && (
                    <>
                      <span className="flex-grow text-left">{item.name}</span>
                      {item.subItems && (
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedMenus[item.name.toLowerCase() as 'vehicles' | 'fuel'] ? 'transform rotate-180' : ''}`} />
                      )}
                    </>
                  )}
                </Button>
              )}
              {!isMenuCollapsed && item.subItems && expandedMenus[item.name.toLowerCase() as 'vehicles' | 'fuel'] && (
                <div className="ml-4 mt-2 space-y-2">
                  {item.subItems.map((subItem) => (
                    <Button
                      key={subItem.name}
                      variant="ghost"
                      className={`w-full justify-start text-sm ${location.pathname === subItem.path ? 'bg-gray-800 text-white' : ''}`}
                      onClick={() => {
                        navigate(subItem.path);
                        setActivePage(subItem.name);
                      }}
                    >
                      <subItem.icon className="mr-2 h-4 w-4" />
                      <span>{subItem.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="mt-auto mb-4">
          <Button
            variant="ghost"
            className={`w-full justify-start mb-1 ${isMenuCollapsed ? 'px-2' : 'px-4'}`}
            onClick={() => navigate('/profile')}
          >
            <Users className={`${isMenuCollapsed ? 'mx-auto' : 'mr-2'} h-5 w-5`} />
            {!isMenuCollapsed && <span>Kullanıcı Paneli</span>}
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start mb-1 ${isMenuCollapsed ? 'px-2' : 'px-4'}`}
            onClick={() => navigate('/settings')}
          >
            <Settings className={`${isMenuCollapsed ? 'mx-auto' : 'mr-2'} h-5 w-5`} />
            {!isMenuCollapsed  && <span>Ayarlar</span>}
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start mb-1 ${isMenuCollapsed ? 'px-2' : 'px-4'}`}
            onClick={toggleMenu}
          >
            <Menu className={`${isMenuCollapsed ? 'mx-auto' : 'mr-2'} h-5 w-5`} />
            {!isMenuCollapsed && <span>Menüyü Daralt</span>}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 ${isMenuCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm py-4 px-8 flex justify-between items-center fixed top-0 right-0 left-0 z-40" style={{left: isMenuCollapsed ? '4rem' : '16rem'}}>
          <h2 className="text-2xl font-semibold">{activePage}</h2>
          <div className="flex items-center space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0">
                <div className="p-4 bg-gray-100 border-b border-gray-200">
                  <h4 className="font-semibold text-lg">Bildirimler</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.map((task, index) => {
                    const taskDate = parseISO(task.date);
                    const today = new Date();
                    const daysLeft = differenceInDays(taskDate, today);
                    return (
                      <div key={index} className="p-4 border-b border-gray-200 hover:bg-gray-50">
                        <p className="text-sm font-medium text-gray-900">
                          {daysLeft === 0 ? '0 GÜN KALDI' : `${daysLeft} GÜN KALDI`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {task.vehiclePlate} - {getTaskTagName(task.tag)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTaskDate(task.date)} - {task.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {notifications.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    Bildirim bulunmamaktadır.
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar>
                    <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                    <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <div className="p-4 bg-gray-100 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                      <AvatarFallback>{user?.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profil
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/settings')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Ayarlar
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Yardım
                  </Button>
                  <div className="my-2 border-t border-gray-200"></div>
                  <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Çıkış Yap
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8 mt-16">
          {children}
        </main>
      </div>
    </div>  
  );
};

export default Layout;