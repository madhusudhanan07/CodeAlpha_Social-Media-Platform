import Feed from '../components/Feed/Feed';
import RightSidebar from '../components/RightSidebar/RightSidebar';
import styles from './Home.module.css';

export default function Home() {
  return (
    <div className={styles.homeLayout}>
      <div className={styles.feedColumn}>
        <Feed />
      </div>
      <RightSidebar />
    </div>
  );
}
