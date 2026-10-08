import { Button, Icon, useToast, type ButtonSize } from '@/components/ui';
import { useCart } from '@/features/cart/CartContext';
import { useTranslation } from '@/i18n';
import type { Product } from '@/types';
import { productName } from '../catalog';

export function AddToCartButton({
  product,
  quantity = 1,
  size = 'md',
  compact,
}: {
  product: Product;
  quantity?: number;
  size?: ButtonSize;
  compact?: boolean;
}) {
  const { add } = useCart();
  const { show } = useToast();
  const { t, locale } = useTranslation();
  const name = productName(product, locale);

  if (!product.available) {
    return (
      <Button size={size} disabled>
        {t('menu.unavailable')}
      </Button>
    );
  }
  return (
    <Button
      size={size}
      iconOnly={compact}
      aria-label={compact ? `${t('menu.addToCart')}: ${name}` : undefined}
      onClick={() => {
        add(product.id, quantity);
        show(t('menu.addedToCart', { name }), 'success');
      }}
    >
      <Icon name="plus" size={18} />
      {!compact && t('menu.addToCart')}
    </Button>
  );
}
