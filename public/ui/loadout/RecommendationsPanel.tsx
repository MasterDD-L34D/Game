import React, { useMemo, useState } from 'react';

type ExperimentVariant = 'baseline' | 'personalized';

type ImpactDirection = 'positive' | 'negative' | 'neutral';

export interface FeatureContributionView {
  readonly feature: string;
  readonly value: string | number;
  readonly contribution: number;
  readonly weight: number;
  readonly direction: ImpactDirection;
  readonly rationale: string;
}

export interface LoadoutSuggestion {
  readonly loadoutId: string;
  readonly label: string;
  readonly description: string;
  readonly expectedWinRate: number;
  readonly recommendedWeapon: string;
  readonly recommendedCompanion: string;
  readonly contributions: FeatureContributionView[];
}

export interface FeedbackPayload {
  readonly loadoutId: string;
  readonly helpful: boolean;
  readonly reason?: 'weapon' | 'companion' | 'playstyle' | 'stats' | 'other';
  readonly comment?: string;
}

export interface LoadoutRecommendationPanelProps {
  readonly variant: ExperimentVariant;
  readonly recommendations: LoadoutSuggestion[];
  readonly isLoading?: boolean;
  readonly onFeedback?: (feedback: FeedbackPayload) => void;
}

const directionClassName = (direction: ImpactDirection): string => {
  switch (direction) {
    case 'positive':
      return 'loadout-contribution loadout-contribution--positive';
    case 'negative':
      return 'loadout-contribution loadout-contribution--negative';
    default:
      return 'loadout-contribution loadout-contribution--neutral';
  }
};

const formatPercentage = (value: number): string => `${Math.round(value * 100)}%`;

const feedbackReasons: FeedbackPayload['reason'][] = ['weapon', 'companion', 'playstyle', 'stats', 'other'];

const reasonLabels: Record<NonNullable<FeedbackPayload['reason']>, string> = {
  weapon: 'Arma non adatta',
  companion: 'Companion poco utile',
  playstyle: 'Non adatto al mio stile',
  stats: 'Numeri poco convincenti',
  other: 'Altro',
};

const VariantBadge: React.FC<{ variant: ExperimentVariant }> = ({ variant }) => {
  const label = variant === 'personalized' ? 'Personalizzato (beta)' : 'Baseline';
  const toneClass = variant === 'personalized' ? 'loadout-variant loadout-variant--beta' : 'loadout-variant';
  return <span className={toneClass}>{label}</span>;
};

const ContributionList: React.FC<{ contributions: FeatureContributionView[] }> = ({ contributions }) => {
  if (contributions.length === 0) {
    return <p className="loadout-contribution__empty">Nessun contributo disponibile.</p>;
  }
  return (
    <dl className="loadout-contribution__list">
      {contributions.map((item) => (
        <div key={`${item.feature}-${item.value}`} className={directionClassName(item.direction)}>
          <dt className="loadout-contribution__feature">
            <span>{item.feature}</span>
            <small>{String(item.value)}</small>
          </dt>
          <dd className="loadout-contribution__value">
            <strong>{item.contribution >= 0 ? '+' : ''}{item.contribution.toFixed(3)}</strong>
            <span>{item.rationale}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
};

export const LoadoutRecommendationPanel: React.FC<LoadoutRecommendationPanelProps> = ({
  variant,
  recommendations,
  isLoading = false,
  onFeedback,
}) => {
  const [commentByLoadout, setCommentByLoadout] = useState<Record<string, string>>({});
  const [reasonByLoadout, setReasonByLoadout] = useState<Record<string, FeedbackPayload['reason']>>({});

  const bestWinRate = useMemo(
    () => (recommendations.length ? Math.max(...recommendations.map((entry) => entry.expectedWinRate)) : 0),
    [recommendations],
  );

  const handleFeedback = (loadoutId: string, helpful: boolean) => {
    const comment = commentByLoadout[loadoutId];
    const reason = reasonByLoadout[loadoutId];
    onFeedback?.({ loadoutId, helpful, comment, reason });
  };

  return (
    <section className="loadout-recommendations" aria-busy={isLoading}>
      <header className="loadout-recommendations__header">
        <div>
          <h2>Suggerimenti loadout</h2>
          <p className="loadout-recommendations__subtitle">
            Stiamo analizzando le tue telemetrie recenti per proporre build ad alto impatto. Il modello spiega anche il peso delle
            principali feature.
          </p>
        </div>
        <VariantBadge variant={variant} />
      </header>

      {recommendations.length === 0 ? (
        <p className="loadout-recommendations__empty">Nessun suggerimento disponibile per i filtri selezionati.</p>
      ) : (
        <ol className="loadout-recommendations__list">
          {recommendations.map((suggestion) => {
            const relativeLift = bestWinRate ? suggestion.expectedWinRate / bestWinRate : 1;
            return (
              <li key={suggestion.loadoutId} className="loadout-recommendations__item">
                <div className="loadout-recommendations__summary">
                  <h3>{suggestion.label}</h3>
                  <p>{suggestion.description}</p>
                  <div className="loadout-recommendations__meta">
                    <span className="loadout-recommendations__stat">
                      Win rate atteso: <strong>{suggestion.expectedWinRate.toFixed(3)}</strong>
                    </span>
                    <span className="loadout-recommendations__stat">
                      Arma: <code>{suggestion.recommendedWeapon}</code>
                    </span>
                    <span className="loadout-recommendations__stat">
                      Companion: <code>{suggestion.recommendedCompanion}</code>
                    </span>
                    <progress
                      max={1}
                      value={relativeLift}
                      aria-label={`Quota di efficacia rispetto al miglior suggerimento (${formatPercentage(relativeLift)})`}
                    />
                  </div>
                </div>

                <details className="loadout-recommendations__explainability">
                  <summary>Perché questo loadout?</summary>
                  <ContributionList contributions={suggestion.contributions} />
                </details>

                <footer className="loadout-recommendations__feedback">
                  <fieldset>
                    <legend>Questo suggerimento è stato utile?</legend>
                    <div className="loadout-recommendations__feedback-actions">
                      <button type="button" onClick={() => handleFeedback(suggestion.loadoutId, true)}>
                        👍 Sì
                      </button>
                      <button type="button" onClick={() => handleFeedback(suggestion.loadoutId, false)}>
                        👎 No
                      </button>
                    </div>
                  </fieldset>

                  <fieldset className="loadout-recommendations__feedback-reason">
                    <legend>Motivo del feedback</legend>
                    <div className="loadout-recommendations__feedback-reason-list">
                      {feedbackReasons.map((reason) => (
                        <label key={`${suggestion.loadoutId}-${reason}`}>
                          <input
                            type="radio"
                            name={`feedback-reason-${suggestion.loadoutId}`}
                            value={reason}
                            checked={reasonByLoadout[suggestion.loadoutId] === reason}
                            onChange={() =>
                              setReasonByLoadout((prev) => ({
                                ...prev,
                                [suggestion.loadoutId]: reason,
                              }))
                            }
                          />
                          <span>{reasonLabels[reason]}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="loadout-recommendations__feedback-comment">
                    <span>Note aggiuntive</span>
                    <textarea
                      value={commentByLoadout[suggestion.loadoutId] ?? ''}
                      onChange={(event) =>
                        setCommentByLoadout((prev) => ({
                          ...prev,
                          [suggestion.loadoutId]: event.target.value,
                        }))
                      }
                      placeholder="Cosa possiamo migliorare?"
                      rows={2}
                    />
                  </label>
                </footer>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

export default LoadoutRecommendationPanel;
