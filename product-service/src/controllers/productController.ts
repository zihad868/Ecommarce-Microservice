import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/productService';

export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await productService.getProducts(req.query as Record<string, string | undefined>);
    // If the service returns `{ success: true, count: ..., data: ... }` from cache or DB
    // we can just send it. Notice that getProducts in service already formats it.
    if ('success' in result) {
       res.status(200).json(result);
    } else {
       // Just in case it returned raw data (which shouldn't happen based on service implementation)
       res.status(200).json({ success: true, data: result });
    }
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await productService.getProductById(req.params.id as string);
    
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const product = await productService.updateProduct(req.params.id as string, req.body);
    
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const success = await productService.deleteProduct(req.params.id as string);
    
    if (!success) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
