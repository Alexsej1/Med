import { Link, Navigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { BRAND_FULL, BRAND_LEGAL, BRAND_SHORT, BRAND_TAGLINE } from "../brand";
import { useAuth } from "../AuthContext";

export function LandingPage() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/doctor"} replace />;
  }

  return (
    <div className="landing">
      <header className="landing-header motion-header">
        <Link to="/" className="landing-header__brand">
          <BrandMark />
        </Link>
        <nav className="landing-header__nav">
          <a href="#about">О клинике</a>
          <a href="#services">Направления</a>
          <a href="#care">Подход</a>
          <Link to="/login" className="btn btn--small landing-header__cta">
            Вход для сотрудников
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__glow" aria-hidden />
        <div className="landing-hero__inner motion-hero-text">
          <p className="landing-eyebrow">Амбулатория · терапия · семейная медицина</p>
          <h1 className="landing-title">
            <span className="landing-title__brand">{BRAND_SHORT}</span>
            <span className="landing-title__line">медицинский центр</span>
          </h1>
          <p className="landing-lead">{BRAND_TAGLINE}</p>
          <div className="landing-hero__actions">
            <Link to="/login" className="btn btn--large landing-hero__primary">
              Войти в кабинет
            </Link>
            <span className="landing-hero__hint">Для врачей и администраторов центра</span>
          </div>
        </div>
        <aside className="landing-hero__panel motion-hero-aside" aria-label="Ключевые преимущества">
          <div className="landing-stat">
            <span className="landing-stat__icon" aria-hidden>
              ◆
            </span>
            <div>
              <strong>Карта пациента</strong>
              <span>контакты, анамнез и история визитов в одном месте</span>
            </div>
          </div>
          <div className="landing-stat">
            <span className="landing-stat__icon" aria-hidden>
              ◆
            </span>
            <div>
              <strong>Расписание</strong>
              <span>наглядная загрузка дня и запланированные повторные приёмы</span>
            </div>
          </div>
          <div className="landing-stat">
            <span className="landing-stat__icon" aria-hidden>
              ◆
            </span>
            <div>
              <strong>Слаженная работа</strong>
              <span>врач и регистратура ведут записи согласованно и аккуратно</span>
            </div>
          </div>
        </aside>
      </section>

      <section id="about" className="landing-section motion-section">
        <div className="landing-about">
          <div className="landing-about__text">
            <h2 className="landing-h2">О центре</h2>
            <p className="landing-text">
              {BRAND_FULL} ориентирован на внимательный амбулаторный приём: мы собираем жалобы и анамнез, фиксируем
              рекомендации и даты следующих визитов, чтобы лечение было последовательным и понятным пациенту.
            </p>
            <p className="landing-text">
              Наша цель — спокойная атмосфера, ясные формулировки и уважение ко времени людей, которые доверили нам своё
              здоровье.
            </p>
          </div>
          <div className="landing-about__visual" aria-hidden>
            <div className="landing-about__orb" />
            <div className="landing-about__ring" />
          </div>
        </div>
      </section>

      <section id="services" className="landing-section landing-section--muted motion-section">
        <h2 className="landing-h2 landing-h2--center">Чем мы можем помочь</h2>
        <div className="landing-grid">
          <article className="feature-card motion-card">
            <span className="feature-card__icon" aria-hidden />
            <h3>Приём и наблюдение</h3>
            <p>Структурированный осмотр, симптомы и заметки врача сохраняются в карте для следующих визитов.</p>
          </article>
          <article className="feature-card motion-card">
            <span className="feature-card__icon" aria-hidden />
            <h3>Организация визитов</h3>
            <p>Расписание и напоминания о повторных приёмах помогают не терять нить наблюдения.</p>
          </article>
          <article className="feature-card motion-card">
            <span className="feature-card__icon" aria-hidden />
            <h3>Документация</h3>
            <p>Единый контур для записей команды: меньше бумажной рутины — больше времени на пациента.</p>
          </article>
        </div>
      </section>

      <section id="care" className="landing-section motion-section">
        <div className="landing-split">
          <div>
            <h2 className="landing-h2">Подход к лечению</h2>
            <p className="landing-text">
              Врач фиксирует жалобы, результаты осмотра и план действий. Администратор поддерживает запись и журнал
              обращений. Так выстраивается привычный для клиники порядок — только в удобной цифровой форме.
            </p>
            <ul className="landing-list landing-list--checks">
              <li>аккуратное ведение амбулаторной карты;</li>
              <li>прозрачные даты следующих визитов;</li>
              <li>единые стандарты оформления приёма.</li>
            </ul>
            <Link to="/login" className="btn">
              Войти в кабинет
            </Link>
          </div>
          <div className="landing-quote motion-quote">
            <blockquote>
              «Хорошая медицина начинается с порядка в карте и уважения к человеку в кресле пациента.»
            </blockquote>
            <cite>— {BRAND_FULL}</cite>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--trust motion-section">
        <h2 className="landing-h2 landing-h2--center">Важно знать</h2>
        <p className="landing-trust">{BRAND_LEGAL}</p>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__row">
          <BrandMark compact />
          <span>
            © {new Date().getFullYear()} {BRAND_FULL}
          </span>
        </div>
        <p className="landing-footer__fine">Учебный / демонстрационный контур. Не для реальной медицинской документации.</p>
      </footer>
    </div>
  );
}
