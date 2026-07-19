import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar/Sidebar';
import { Outlet } from 'react-router-dom';

export default function MainLayout() { return (<div className="app-layout"><Navbar /><div className="main-content"><Sidebar /><main><Outlet /></main></div></div>); }
