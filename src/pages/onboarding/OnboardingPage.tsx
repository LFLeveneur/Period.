// Page d'onboarding — nouveau design avec icônes, cards de sélection et transitions fluides
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { User, Heart, Calendar as CalendarIcon, ArrowRight, Check, AlertCircle, ChevronLeft } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/profileService';
import { saveHealthData } from '@/services/healthDataService';
import { InputField } from '@/components/ui/InputField';
import * as analytics from '@/lib/analytics';
import { trackEvent } from '@/services/analyticsService';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuthContext();

  // Étape courante (1 à 3)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1 — prénom
  const [name, setName] = useState('');

  // Step 2 — choix du suivi de cycle
  const [trackCycle, setTrackCycle] = useState<boolean | null>(null);

  // Step 3 — dates de règles
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');

  // États UI
  const [loading, setLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pré-remplit le prénom depuis le profil existant
  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  // Dates limites pour les pickers
  const today = new Date().toISOString().split('T')[0];
  const todayMinus60 = new Date(Date.now() - 60 * 864e5).toISOString().split('T')[0];
  const todayMinus90 = new Date(Date.now() - 90 * 864e5).toISOString().split('T')[0];
  const date1Minus15 = date1
    ? new Date(new Date(date1).getTime() - 15 * 864e5).toISOString().split('T')[0]
    : '';

  // Calcul de l'écart en jours entre les deux dates
  const cycleDiff =
    date1 && date2
      ? Math.round(Math.abs(new Date(date1).getTime() - new Date(date2).getTime()) / 864e5)
      : null;

  // Validations
  const isStep1Valid = name.trim().length > 0;
  const isStep2Valid = trackCycle !== null;
  const isStep3Valid = date1 !== '' && date2 !== '' && date2 < date1;
  const showCycleDiff = cycleDiff !== null;
  const isCycleDiffNormal = cycleDiff !== null && cycleDiff >= 15 && cycleDiff <= 45;

  function goToStep(step: 1 | 2 | 3) {
    setErrorMessage('');
    setCurrentStep(step);
  }

  // Retour — naviguer à la page précédente ou quitter l'onboarding
  function handleBack() {
    if (currentStep === 1) {
      navigate('/');
    } else {
      goToStep((currentStep - 1) as 1 | 2 | 3);
    }
  }

  // Soumission step 1 — sauvegarde le prénom
  async function handleStep1Submit() {
    if (!user || !isStep1Valid) return;
    setLoading(true);
    analytics.track('onboarding_step_started', { step: 1 });
    const { error } = await updateProfile(user.id, { name: name.trim() });
    setLoading(false);
    if (error) {
      setErrorMessage(error ?? 'une erreur est survenue, réessaie.');
      return;
    }
    analytics.track('onboarding_step_completed', { step: 1 });
    goToStep(2);
  }

  // Soumission step 2 — sauvegarde le choix de suivi de cycle
  async function handleStep2Submit() {
    if (!user || trackCycle === null) return;
    setLoading(true);
    analytics.track('onboarding_step_started', { step: 2 });

    if (trackCycle) {
      // Cycle suivi → passer aux dates
      const { error } = await updateProfile(user.id, { cycle_tracking: true });
      setLoading(false);
      if (error) {
        setErrorMessage(error ?? 'une erreur est survenue, réessaie.');
        return;
      }
      analytics.track('onboarding_step_completed', { step: 2 });
      goToStep(3);
    } else {
      // Cycle non suivi → onboarding terminé
      const { error } = await updateProfile(user.id, {
        cycle_tracking: false,
        onboarding_completed: true,
      });
      setLoading(false);
      if (error) {
        setErrorMessage(error ?? 'une erreur est survenue, réessaie.');
        return;
      }
      analytics.track('onboarding_completed', { cycle_tracking: false });
      // Track dans Supabase — onboarding_completed sans cycle
      await trackEvent('onboarding_completed');
      navigate('/onboarding/reveal', { replace: true });
    }
  }

  // Soumission step 3 — sauvegarde les dates et finalise l'onboarding
  async function handleStep3Submit() {
    if (!user || !isStep3Valid) return;
    setGlobalLoading(true);
    setErrorMessage('');
    analytics.track('onboarding_step_started', { step: 3 });

    const cycleLength = cycleDiff ?? 28;

    const [r1, r2] = await Promise.all([
      saveHealthData(user.id, date1, cycleLength, 5),
      updateProfile(user.id, { onboarding_completed: true }),
    ]);

    setGlobalLoading(false);

    if (r1.error || r2.error) {
      setErrorMessage(r1.error || r2.error || 'une erreur est survenue, réessaie.');
      return;
    }
    analytics.track('onboarding_step_completed', { step: 3 });
    analytics.track('onboarding_completed', { cycle_tracking: true });
    // Track dans Supabase — cycle_filled (dates renseignées) + onboarding_completed
    await Promise.all([
      trackEvent('cycle_filled', { cycle_length: cycleLength }),
      trackEvent('onboarding_completed'),
    ]);
    navigate('/onboarding/reveal', { replace: true });
  }

  // Icône selon l'étape courante
  const stepIcons = [
    <User key="user" size={28} />,
    <Heart key="heart" size={28} />,
    <CalendarIcon key="cal" size={28} />,
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* En-tête — bouton retour + indicateur d'étape */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-10) var(--space-4) var(--space-4)',
          position: 'relative',
          zIndex: 'var(--z-nav)' as React.CSSProperties['zIndex'],
        }}
      >
        <button
          onClick={handleBack}
          aria-label="étape précédente"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text)',
            transition: 'transform var(--duration-fast)',
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Compteur d'étape */}
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
            color: 'var(--color-text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Étape {currentStep}/3
        </span>

        {/* Placeholder pour centrer le compteur */}
        <div style={{ width: '40px' }} />
      </header>

      {/* Slider — les 3 steps côte à côte */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            width: '300%',
            transform: `translateX(-${(currentStep - 1) * 33.333}%)`,
            transition: `transform var(--duration-slow) ease-in-out`,
            alignItems: 'flex-start',
          }}
        >

          {/* ─── Step 1 — prénom ─── */}
          <div
            style={{
              width: 'calc(100% / 3)',
              padding: 'var(--space-6) var(--space-4) 120px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-8)',
              boxSizing: 'border-box',
            }}
          >
            {/* Badge icône */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stepIcons[0]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <h1
                  style={{
                    fontSize: 'var(--text-3xl)',
                    fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-text)',
                    margin: 0,
                    lineHeight: 'var(--leading-tight)',
                  }}
                >
                  enchantée,{' '}
                  <span style={{ color: 'var(--color-primary)' }}>comment t'appelles-tu ?</span>
                </h1>
                <p
                  style={{
                    fontSize: 'var(--text-base)',
                    color: 'var(--color-text-muted)',
                    margin: 0,
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  period. personnalisera chaque recommandation et chaque séance pour toi.
                </p>
              </div>
            </div>

            <InputField
              id="name"
              label="ton prénom"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              placeholder="Mathilde"
              autoComplete="given-name"
            />

            {errorMessage && currentStep === 1 && (
              <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', margin: 0 }}>
                {errorMessage}
              </p>
            )}
          </div>

          {/* ─── Step 2 — suivi du cycle ─── */}
          <div
            style={{
              width: 'calc(100% / 3)',
              padding: 'var(--space-6) var(--space-4) 120px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-8)',
              boxSizing: 'border-box',
            }}
          >
            {/* Badge icône + titre */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stepIcons[1]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <h1
                  style={{
                    fontSize: 'var(--text-3xl)',
                    fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-text)',
                    margin: 0,
                    lineHeight: 'var(--leading-tight)',
                  }}
                >
                  suivi du cycle
                </h1>
                <p
                  style={{
                    fontSize: 'var(--text-base)',
                    color: 'var(--color-text-muted)',
                    margin: 0,
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  period. croise tes séances avec ton cycle pour que tu comprennes enfin pourquoi certaines semaines sont plus dures que d'autres — et quand aller chercher tes PRs.
                </p>
              </div>
            </div>

            {/* Cards de sélection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Option oui */}
              <button
                onClick={() => setTrackCycle(true)}
                style={{
                  width: '100%',
                  padding: 'var(--space-5)',
                  borderRadius: 'var(--radius-xl)',
                  border: `2px solid ${trackCycle === true ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  backgroundColor: trackCycle === true ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  boxShadow: trackCycle === true ? 'var(--shadow-sm)' : 'none',
                  transition: `border-color var(--duration-normal), background-color var(--duration-normal)`,
                }}
              >
                {/* Radio indicator */}
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: 'var(--radius-full)',
                    border: `2px solid ${trackCycle === true ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor: trackCycle === true ? 'var(--color-primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: `all var(--duration-normal)`,
                  }}
                >
                  {trackCycle === true && <Check size={13} color="white" strokeWidth={3} />}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text)',
                      display: 'block',
                    }}
                  >
                    oui, je veux comprendre mon corps
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-muted)',
                      display: 'block',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    c'est pour ça que period. existe. 🖤
                  </span>
                </div>
              </button>

              {/* Option non */}
              <button
                onClick={() => setTrackCycle(false)}
                style={{
                  width: '100%',
                  padding: 'var(--space-5)',
                  borderRadius: 'var(--radius-xl)',
                  border: `2px solid ${trackCycle === false ? 'var(--color-text)' : 'var(--color-border)'}`,
                  backgroundColor: trackCycle === false ? 'rgba(47, 0, 87, 0.05)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  transition: `border-color var(--duration-normal), background-color var(--duration-normal)`,
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: 'var(--radius-full)',
                    border: `2px solid ${trackCycle === false ? 'var(--color-text)' : 'var(--color-border)'}`,
                    backgroundColor: trackCycle === false ? 'var(--color-text)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: `all var(--duration-normal)`,
                  }}
                >
                  {trackCycle === false && <Check size={13} color="white" strokeWidth={3} />}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 'var(--text-base)',
                      fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                      color: 'var(--color-text)',
                      display: 'block',
                    }}
                  >
                    non, pas pour l'instant
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-text-muted)',
                      display: 'block',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    l'app fonctionnera mais tu passeras à côté de l'essentiel. tu pourras l'activer depuis ton profil.
                  </span>
                </div>
              </button>
            </div>

            {errorMessage && currentStep === 2 && (
              <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', margin: 0 }}>
                {errorMessage}
              </p>
            )}
          </div>

          {/* ─── Step 3 — saisie des dates ─── */}
          <div
            style={{
              width: 'calc(100% / 3)',
              padding: 'var(--space-6) var(--space-4) 120px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-8)',
              boxSizing: 'border-box',
            }}
          >
            {/* Badge icône + titre */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-xl)',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stepIcons[2]}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <h1
                  style={{
                    fontSize: 'var(--text-3xl)',
                    fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                    color: 'var(--color-text)',
                    margin: 0,
                    lineHeight: 'var(--leading-tight)',
                  }}
                >
                  tes dates clés
                </h1>
                <p
                  style={{
                    fontSize: 'var(--text-base)',
                    color: 'var(--color-text-muted)',
                    margin: 0,
                    lineHeight: 'var(--leading-relaxed)',
                  }}
                >
                  on a besoin de deux dates pour estimer la longueur de ton cycle.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Date 1 — dernières règles */}
              <InputField
                id="date1"
                label="début de tes dernières règles"
                type="date"
                value={date1}
                onChange={(e) => {
                  setDate1(e.target.value);
                  // Réinitialise date2 si elle devient invalide par rapport à date1
                  if (date2 && e.target.value && date2 >= e.target.value) {
                    setDate2('');
                  }
                }}
                max={today}
                min={todayMinus60}
              />

              {/* Date 2 — règles précédentes */}
              <InputField
                id="date2"
                label="début des règles précédentes"
                type="date"
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                max={date1Minus15 || todayMinus60}
                min={todayMinus90}
              />

              {/* Estimation du cycle en temps réel */}
              {showCycleDiff && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isCycleDiffNormal ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                    border: `1px solid ${isCycleDiffNormal ? 'var(--color-success-bg)' : 'var(--color-warning-bg)'}`,
                    display: 'flex',
                    alignItems: isCycleDiffNormal ? 'center' : 'flex-start',
                    gap: 'var(--space-3)',
                  }}
                >
                  {isCycleDiffNormal ? (
                    <>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-success-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check size={16} color="var(--color-success)" strokeWidth={3} />
                      </div>
                      <span
                        style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
                          color: 'var(--color-success)',
                          flex: 1,
                        }}
                      >
                        cycle estimé
                      </span>
                      <span
                        style={{
                          fontSize: 'var(--text-xl)',
                          fontWeight: 'var(--font-bold)' as React.CSSProperties['fontWeight'],
                          color: 'var(--color-success)',
                        }}
                      >
                        {cycleDiff} <span style={{ fontSize: 'var(--text-sm)', opacity: 0.7 }}>jours</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p
                        style={{
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-warning)',
                          margin: 0,
                          lineHeight: 'var(--leading-relaxed)',
                          fontWeight: 'var(--font-medium)' as React.CSSProperties['fontWeight'],
                        }}
                      >
                        ton cycle de {cycleDiff} jours semble hors de la moyenne habituelle (21 à 45 jours). tu pourras
                        ajuster cette donnée dans les paramètres si besoin.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {errorMessage && currentStep === 3 && (
              <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', margin: 0 }}>
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer fixe — CTA selon l'étape */}
      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--space-4)',
          background: `linear-gradient(to top, var(--color-bg) 70%, transparent)`,
          zIndex: 'var(--z-nav)' as React.CSSProperties['zIndex'],
        }}
      >
        {currentStep === 1 && (
          <button
            onClick={handleStep1Submit}
            disabled={!isStep1Valid || loading}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-text)',
              color: 'var(--color-text-light)',
              border: 'none',
              cursor: isStep1Valid && !loading ? 'pointer' : 'not-allowed',
              opacity: isStep1Valid && !loading ? 1 : 0.5,
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 'var(--space-6)',
              paddingRight: 'var(--space-6)',
              boxShadow: 'var(--shadow-xl)',
              transition: `opacity var(--duration-normal), transform var(--duration-fast)`,
            }}
          >
            <span>continuer</span>
            {loading ? (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid var(--color-text-light)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        )}

        {currentStep === 2 && (
          <button
            onClick={handleStep2Submit}
            disabled={!isStep2Valid || loading}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-text)',
              color: 'var(--color-text-light)',
              border: 'none',
              cursor: isStep2Valid && !loading ? 'pointer' : 'not-allowed',
              opacity: isStep2Valid && !loading ? 1 : 0.5,
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 'var(--space-6)',
              paddingRight: 'var(--space-6)',
              boxShadow: 'var(--shadow-xl)',
              transition: `opacity var(--duration-normal), transform var(--duration-fast)`,
            }}
          >
            <span>continuer</span>
            {loading ? (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid var(--color-text-light)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        )}

        {currentStep === 3 && (
          <button
            onClick={handleStep3Submit}
            disabled={!isStep3Valid || globalLoading}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--color-text)',
              color: 'var(--color-text-light)',
              border: 'none',
              cursor: isStep3Valid && !globalLoading ? 'pointer' : 'not-allowed',
              opacity: isStep3Valid && !globalLoading ? 1 : 0.5,
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-semibold)' as React.CSSProperties['fontWeight'],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: 'var(--space-6)',
              paddingRight: 'var(--space-6)',
              boxShadow: 'var(--shadow-xl)',
              transition: `opacity var(--duration-normal), transform var(--duration-fast)`,
            }}
          >
            <span>terminer</span>
            {globalLoading ? (
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid var(--color-text-light)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            ) : (
              <Check size={20} />
            )}
          </button>
        )}
      </footer>

      {/* Spinner plein écran pendant la sauvegarde finale */}
      {globalLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(47, 0, 87, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'var(--z-overlay)' as React.CSSProperties['zIndex'],
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--color-text-light)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}
