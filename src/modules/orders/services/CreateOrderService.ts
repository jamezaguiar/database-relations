import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const findCustomer = await this.customersRepository.findById(customer_id);

    if (!findCustomer) {
      throw new AppError('Customer does not exists.');
    }

    if (!products) {
      throw new AppError('Empty products array');
    }

    const productsIDs = products.map(eachProduct => {
      return { id: eachProduct.id };
    });

    const findProducts = await this.productsRepository.findAllById(productsIDs);

    if (findProducts.length === 0) {
      throw new AppError('One or more products does not exists.');
    }

    const formattedProducts = findProducts.map(product => {
      const productIndex = products.findIndex(
        eachProduct => eachProduct.id === product.id,
      );

      if (product.quantity < products[productIndex].quantity) {
        throw new AppError('Insufficient quantity.');
      }

      return {
        product_id: product.id,
        quantity: products[productIndex].quantity,
        price: product.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer: findCustomer,
      products: formattedProducts,
    });

    const updateQuantityArray = formattedProducts.map(product => {
      return {
        id: product.product_id,
        quantity: product.quantity,
      };
    });

    await this.productsRepository.updateQuantity(updateQuantityArray);

    return order;
  }
}

export default CreateOrderService;
