import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFeedbackEntity, UserFeedbackStatus } from '../entities/user-feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(UserFeedbackEntity)
    private readonly feedbackRepository: Repository<UserFeedbackEntity>,
  ) {}

  async create(data: CreateFeedbackDto, user: { userId: string; username?: string }) {
    const feedback = this.feedbackRepository.create({
      id: `uf-${Math.random().toString(36).substring(2, 11)}`,
      kind: data.kind,
      message: data.message.trim(),
      contact: data.contact?.trim() || undefined,
      userId: user.userId,
      userName: user.username,
      status: 'new',
    });
    return this.feedbackRepository.save(feedback);
  }

  async findAll() {
    return this.feedbackRepository.find({ order: { createdAt: 'DESC' } });
  }

  async updateStatus(id: string, status?: UserFeedbackStatus) {
    const allowedStatuses: UserFeedbackStatus[] = ['new', 'reviewed', 'closed'];
    if (!status || !allowedStatuses.includes(status)) {
      throw new BadRequestException('Unsupported feedback status');
    }

    const feedback = await this.feedbackRepository.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Feedback not found');
    feedback.status = status;
    return this.feedbackRepository.save(feedback);
  }
}
