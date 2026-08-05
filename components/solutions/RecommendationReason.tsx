type Props = {
  text: string;
};

export default function RecommendationReason({ text }: Props) {
  return (
    <p className="text-xs text-slate-400" aria-label={text}>
      {text}
    </p>
  );
}
