import { Link } from 'react-router';
import { paths } from '@/app/routes';
import { Button, Icon, ImagePlaceholder, Price } from '@/components/ui';
import { bookTheme } from '@/features/menu/bookThemes';
import { productName } from '@/features/menu/catalog';
import { useTranslation } from '@/i18n';
import type { CartLine, Product } from '@/types';
import { useCart } from '../CartContext';
import { QuantityStepper } from './QuantityStepper';
import styles from './cart.module.css';

export function CartLineItem({ line, product }: { line: CartLine; product: Product }) {
  const { t, locale, formatPrice } = useTranslation();
  const { setQuantity, remove } = useCart();
  const name = productName(product, locale);
  return (
    <li className={styles.line} data-testid="cart-line">
      <ImagePlaceholder
        compact
        ratio="1 / 1"
        tone={bookTheme(product.category).cloth}
        className={styles.lineImage}
      />
      <h3 className={styles.lineName}>
        <Link to={paths.product(product.id)}>{name}</Link>
        <span className={styles.lineUnit}>{formatPrice(line.unitPrice)}</span>
      </h3>
      <Price cents={line.lineTotal} className={styles.lineTotal} />
      <div className={styles.lineControls}>
        <QuantityStepper
          value={line.quantity}
          min={1}
          onChange={(quantity) => setQuantity(line.key, quantity)}
          decreaseLabel={t('cart.decrease', { name })}
          increaseLabel={t('cart.increase', { name })}
          valueLabel={t('cart.quantityOf', { name })}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => remove(line.key)}
          aria-label={t('cart.remove', { name })}
        >
          <Icon name="trash" size={18} />
        </Button>
      </div>
    </li>
  );
}
